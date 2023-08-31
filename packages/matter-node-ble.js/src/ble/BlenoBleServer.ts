/**
 * @license
 * Copyright 2022-2023 Project CHIP Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import Bleno from "@abandonware/bleno";
import {
    BleError,
    BLE_MATTER_C1_CHARACTERISTIC_UUID,
    BLE_MATTER_C2_CHARACTERISTIC_UUID,
    BLE_MATTER_C3_CHARACTERISTIC_UUID,
    BLE_MATTER_SERVICE_UUID,
    BtpFlowError,
    BtpSessionHandler,
    BTP_CONN_RSP_TIMEOUT_MS,
} from "@project-chip/matter.js/ble";
import { Channel, InternalError } from "@project-chip/matter.js/common";
import { Logger } from "@project-chip/matter.js/log";
import { Time } from "@project-chip/matter.js/time";
import { ByteArray, getPromiseResolver } from "@project-chip/matter.js/util";
import { BleOptions } from "./BleNode";

const logger = Logger.get("BlenoBleServer");

class BtpWriteCharacteristicC1 extends Bleno.Characteristic {
    constructor(private readonly bleServer: BlenoBleServer) {
        super({
            uuid: BLE_MATTER_C1_CHARACTERISTIC_UUID,
            properties: ["write"],
        });
    }

    override onWriteRequest(
        data: Buffer,
        offset: number,
        withoutResponse: boolean,
        callback: (result: number) => void,
    ) {
        logger.debug(`C1 write request: ${data.toString("hex")} ${offset} ${withoutResponse}`);

        try {
            this.bleServer.handleC1WriteRequest(data, offset, withoutResponse);
            callback(this.RESULT_SUCCESS);
        } catch (e) {
            logger.error(`C1 write request failed: ${e}`);
            callback(this.RESULT_UNLIKELY_ERROR);
        }
    }
}

class BtpIndicateCharacteristicC2 extends Bleno.Characteristic {
    constructor(private readonly bleServer: BlenoBleServer) {
        super({
            uuid: BLE_MATTER_C2_CHARACTERISTIC_UUID,
            properties: ["indicate"],
        });
    }

    override async onSubscribe(maxValueSize: number, updateValueCallback: (data: Buffer) => void) {
        logger.debug(`C2 subscribe ${maxValueSize}`);

        await this.bleServer.handleC2SubscribeRequest(maxValueSize, updateValueCallback);
    }

    override async onUnsubscribe() {
        logger.debug("C2 unsubscribe");
        await this.bleServer.close();
    }

    override onIndicate() {
        logger.debug("C2 indicate");
        this.bleServer.handleC2Indicate();
    }
}

class BtpReadCharacteristicC3 extends Bleno.Characteristic {
    constructor(private readonly bleServer: BlenoBleServer) {
        super({
            uuid: BLE_MATTER_C3_CHARACTERISTIC_UUID,
            properties: ["read"],
        });
    }

    override onReadRequest(offset: number, callback: (result: number, data?: Buffer) => void) {
        try {
            const data = this.bleServer.handleC3ReadRequest(offset);
            logger.debug(`C3 read request: ${data.toString("hex")} ${offset}`);
            callback(this.RESULT_SUCCESS, data);
        } catch (e) {
            logger.debug(`C3 read request failed : ${e} ${offset}`);
            callback(this.RESULT_INVALID_OFFSET);
        }
    }
}

class BtpService extends Bleno.PrimaryService {
    constructor(bleServer: BlenoBleServer) {
        super({
            uuid: BLE_MATTER_SERVICE_UUID,
            characteristics: [
                new BtpWriteCharacteristicC1(bleServer),
                new BtpIndicateCharacteristicC2(bleServer),
                new BtpReadCharacteristicC3(bleServer),
            ],
        });
    }
}

/**
 * Implements the Matter over BLE server using Bleno as Peripheral.
 *
 * Note: Bleno is only supporting a single connection at a time right now - mainly because it also only can announce
 * one BLE device at a time!
 */
export class BlenoBleServer implements Channel<ByteArray> {
    private state = "unknown";
    isAdvertising = false;
    private additionalAdvertisingData: Buffer = Buffer.alloc(0);
    private advertisingData: Buffer | undefined;

    private latestHandshakePayload: Buffer | undefined;
    private btpSession: BtpSessionHandler | undefined;

    private onMatterMessageListener: ((socket: Channel<ByteArray>, data: ByteArray) => void) | undefined;
    private writeConformationResolver: ((value: void) => void) | undefined;

    private clientAddress: string | undefined;
    private btpHandshakeTimeout = Time.getTimer(BTP_CONN_RSP_TIMEOUT_MS, () => this.btpHandshakeTimeoutTriggered());

    private readonly matterBleService = new BtpService(this);

    constructor(options?: BleOptions) {
        // Bleno gets automatically initialized on import already!
        if (options?.hciId !== undefined) {
            process.env.BLENO_HCI_DEVICE_ID = options?.hciId.toString();
        }

        // Write Bleno into this class
        Bleno.on("stateChange", state => {
            if (state === this.state) return;
            this.state = state;
            logger.debug(`stateChange: ${state}, address = ${Bleno.address}`);
            if (state !== "poweredOn") {
                Bleno.stopAdvertising();
            } else if (this.advertisingData) {
                Bleno.startAdvertisingWithEIRData(this.advertisingData);
                this.isAdvertising = true;
            }
        });

        // Linux only events /////////////////
        Bleno.on("accept", clientAddress => {
            logger.debug(`accept new connection, client: ${clientAddress}`);
            this.clientAddress = clientAddress;
            Bleno.updateRssi();
        });

        Bleno.on("disconnect", clientAddress => {
            logger.debug(`disconnect, client: ${clientAddress}`);
            if (this.btpSession !== undefined) {
                this.btpSession
                    .close()
                    .then(() => {
                        this.btpSession = undefined;
                    })
                    .catch(() => {
                        this.btpSession = undefined;
                    });
            }
        });

        Bleno.on("rssiUpdate", rssi => {
            logger.debug(`rssiUpdate: ${rssi}`);
        });
        //////////////////////////////////////

        Bleno.on("mtuChange", mtu => {
            logger.debug(`mtuChange: ${mtu}`);
        });

        Bleno.on("advertisingStart", error => {
            logger.debug(`advertisingStart: ${error ? `error ${error}` : "success"}`);

            if (!error) {
                Bleno.setServices([this.matterBleService]);
            }
            // TODO handle transport error
        });

        Bleno.on("advertisingStop", () => {
            logger.debug("advertisingStop");
        });

        Bleno.on("servicesSet", error => {
            logger.debug(`servicesSet: ${error ? `error ${error}` : "success"}`);
        });
    }

    /**
     * Process a Write request on characteristic C1 from the Matter service.
     * The data are checked if it might be a handshake request and stored until the subscribe request comes in.
     * Otherwise, the data are forwarded to the BTP session handler to be decoded and processed.
     *
     * @param data
     * @param offset
     * @param withoutResponse
     */
    handleC1WriteRequest(data: Buffer, offset: number, withoutResponse: boolean) {
        if (offset !== 0 || withoutResponse) {
            throw new BleError(`Offset ${offset} or withoutResponse ${withoutResponse} not supported`);
        }

        if (data[0] === 0x65 && data[1] === 0x6c && data.length === 9) {
            // Check if the first two bytes and length match the Matter handshake
            this.btpHandshakeTimeout.start(); // starts timer

            logger.info(
                `Received Matter handshake request: ${data.toString("hex")}, store until subscribe request comes in.`,
            );
            this.latestHandshakePayload = data;
            // TODO Handle edge case where handshake comes with an already open BTP session (should never happen?)
        } else {
            if (this.btpSession !== undefined) {
                logger.debug(`Received Matter data for BTP Session: ${data.toString("hex")}`);
                void this.btpSession.handleIncomingBleData(new ByteArray(data));
            } else {
                throw new BtpFlowError(
                    `Received Matter data but no BTP session was initialized: ${data.toString("hex")}`,
                );
            }
        }
    }

    /**
     * Process a Subscribe request on characteristic C2 from the Matter service.
     * This is expected directly after a handshake request and initializes the BTP session handler with the stored
     * handshake payload.
     * The BtpSessionHandler instance is wired with the bleno instance for sending data and disconnecting.
     *
     * @param maxValueSize
     * @param updateValueCallback
     */
    async handleC2SubscribeRequest(maxValueSize: number, updateValueCallback: (data: Buffer) => void) {
        if (this.latestHandshakePayload === undefined) {
            throw new BtpFlowError(`Subscription request received before handshake Request`);
        }
        if (this.btpSession !== undefined) {
            throw new BtpFlowError(
                `Subscription request received but BTP session already initialized. Can not handle two sessions!`,
            );
        }
        this.btpHandshakeTimeout.stop();

        this.btpSession = await BtpSessionHandler.createFromHandshakeRequest(
            Math.min(Bleno.mtu - 3, maxValueSize),
            new ByteArray(this.latestHandshakePayload),

            // callback to write data to characteristic C2
            async (data: ByteArray) => {
                updateValueCallback(Buffer.from(data.buffer));
                const { promise, resolver } = await getPromiseResolver<void>();
                this.writeConformationResolver = resolver;

                return promise;
            },

            // callback to disconnect the BLE connection
            async () => this.close(),

            // callback to forward decoded and de-assembled Matter messages to ExchangeManager
            async (data: ByteArray) => {
                if (this.onMatterMessageListener === undefined) {
                    throw new InternalError(`No listener registered for Matter messages`);
                }
                this.onMatterMessageListener(this, data);
            },
        );
        this.latestHandshakePayload = undefined; // BTP Session initialized, handshake payload not needed anymore
    }

    handleC2Indicate() {
        if (this.writeConformationResolver !== undefined) {
            this.writeConformationResolver();
            this.writeConformationResolver = undefined;
        } else {
            logger.warn(`Received C2 indication but no former write expected a confirmation`);
        }
    }

    /**
     * Process a Read request on characteristic C3 from the Matter service.
     * The relevant data needs optionally to be set before advertising, else empty data are used.
     *
     * @param offset
     */
    handleC3ReadRequest(offset: number) {
        if (offset > this.additionalAdvertisingData.length) {
            throw new BleError(`Offset ${offset} is larger than data ${this.additionalAdvertisingData.length}`);
        } else {
            return this.additionalAdvertisingData.subarray(offset);
        }
    }

    async advertise(advertiseData: ByteArray, additionalAdvertisementData?: ByteArray) {
        this.advertisingData = Buffer.from(advertiseData.buffer);

        if (additionalAdvertisementData) {
            this.additionalAdvertisingData = Buffer.from(additionalAdvertisementData.buffer);
        } else {
            this.additionalAdvertisingData = Buffer.alloc(0);
        }

        if (this.isAdvertising) {
            await this.stopAdvertising();
            this.isAdvertising = false;
        }

        if (this.state === "poweredOn") {
            Bleno.startAdvertisingWithEIRData(this.advertisingData);
            this.isAdvertising = true;
        } else {
            logger.debug(`State is ${this.state}, advertise when powered on`);
        }
        return new Promise<void>(resolve => {
            Bleno.once("advertisingStart", () => resolve());
        });
    }

    async stopAdvertising() {
        if (this.isAdvertising) {
            return new Promise<void>(resolve => {
                Bleno.stopAdvertising();
                Bleno.once("advertisingStop", () => {
                    this.isAdvertising = false;
                    resolve();
                });
            });
        }
    }

    setMatterMessageListener(listener: (socket: Channel<ByteArray>, data: ByteArray) => void) {
        if (this.onMatterMessageListener !== undefined) {
            throw new InternalError(`onData listener already set`);
        }
        this.onMatterMessageListener = listener;
    }

    async btpHandshakeTimeoutTriggered() {
        await this.disconnect();
        logger.error("Timeout for handshake subscribe request on C2 reached, disconnecting.");
    }

    async close() {
        this.btpHandshakeTimeout.stop();
        await this.disconnect();
        if (this.btpSession !== undefined) {
            await this.btpSession.close();
            this.btpSession = undefined;
        }
    }

    async disconnect() {
        return new Promise<void>(resolve => {
            Bleno.once("disconnect", () => resolve());
            Bleno.disconnect();
        });
    }

    // Channel<ByteArray>
    /**
     * Send a Matter message to the connected device - need to do BTP assembly first.
     *
     * @param data
     */
    async send(data: ByteArray) {
        if (this.btpSession === undefined) {
            throw new BtpFlowError(`Can not send data, no BTP session initialized`);
        }
        await this.btpSession.sendMatterMessage(data);
    }

    // Channel<ByteArray>
    get name() {
        return `ble://${this.clientAddress}`;
    }
}
