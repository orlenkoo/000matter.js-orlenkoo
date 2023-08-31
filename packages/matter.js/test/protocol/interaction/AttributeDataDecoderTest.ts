/**
 * @license
 * Copyright 2022-2023 Project CHIP Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { AttributeId } from "../../../src/datatype/AttributeId.js";
import { ClusterId } from "../../../src/datatype/ClusterId.js";
import { EndpointNumber } from "../../../src/datatype/EndpointNumber.js";
import { EventId } from "../../../src/datatype/EventId.js";
import { VendorId } from "../../../src/datatype/VendorId.js";
import {
    decodeUnknownAttributeValue,
    normalizeAndDecodeReadAttributeReport,
    normalizeAttributeData,
} from "../../../src/protocol/interaction/AttributeDataDecoder.js";
import {
    TlvAttributeData,
    TlvAttributeReport,
    TlvDataReport,
} from "../../../src/protocol/interaction/InteractionProtocol.js";
import { TlvArray } from "../../../src/tlv/TlvArray.js";
import { TlvNullable } from "../../../src/tlv/TlvNullable.js";
import { TlvUInt8 } from "../../../src/tlv/TlvNumber.js";
import { TlvField, TlvObject } from "../../../src/tlv/TlvObject.js";
import { TypeFromSchema } from "../../../src/tlv/TlvSchema.js";
import { ByteArray } from "../../../src/util/ByteArray.js";

//import { AllClustersMap } from "../../../src/cluster/ClusterHelper.js";

const TlvAclTestSchema = TlvObject({
    privilege: TlvField(1, TlvUInt8),
    authMode: TlvField(2, TlvUInt8),
    subjects: TlvField(3, TlvNullable(TlvUInt8)),
    targets: TlvField(4, TlvNullable(TlvUInt8)),
});

const TlvAclTestArraySchema = TlvArray(TlvAclTestSchema);

describe("AttributeDataDecoder", () => {
    describe("decode chunked array using raw data from chip-tool", () => {
        it("decode chunked array with two elements", () => {
            const data: TypeFromSchema<typeof TlvAttributeReport>[] = [
                {
                    attributeData: {
                        path: {
                            endpointId: EndpointNumber(0),
                            clusterId: ClusterId(0x1f),
                            attributeId: AttributeId(0),
                        },
                        data: TlvArray(TlvAclTestSchema).encodeTlv([]),
                        dataVersion: 0,
                    },
                },
                {
                    attributeData: {
                        path: {
                            endpointId: EndpointNumber(0),
                            clusterId: ClusterId(0x1f),
                            attributeId: AttributeId(0),
                            listIndex: null,
                        },
                        data: TlvAclTestSchema.encodeTlv({
                            privilege: 1,
                            authMode: 2,
                            subjects: null,
                            targets: null,
                        }),
                        dataVersion: 0,
                    },
                },
                {
                    attributeData: {
                        path: {
                            endpointId: EndpointNumber(0),
                            clusterId: ClusterId(0x1f),
                            attributeId: AttributeId(0),
                            listIndex: null,
                        },
                        data: TlvAclTestSchema.encodeTlv({
                            privilege: 2,
                            authMode: 2,
                            subjects: null,
                            targets: null,
                        }),
                        dataVersion: 0,
                    },
                },
            ];
            const normalizedData = normalizeAndDecodeReadAttributeReport(data);

            expect(normalizedData.length).toBe(1);
            expect(normalizedData[0].path).toEqual({
                attributeId: AttributeId(0),
                attributeName: "acl",
                clusterId: ClusterId(0x1f),
                endpointId: EndpointNumber(0),
                nodeId: undefined,
            });
            expect(normalizedData[0].value).toEqual([
                {
                    privilege: 1,
                    authMode: 2,
                    subjects: null,
                    targets: null,
                },
                {
                    privilege: 2,
                    authMode: 2,
                    subjects: null,
                    targets: null,
                },
            ]);
        });

        it("decode chunked array with indexed adding", () => {
            const data: TypeFromSchema<typeof TlvAttributeReport>[] = [
                {
                    attributeData: {
                        path: {
                            endpointId: EndpointNumber(0),
                            clusterId: ClusterId(0x1f),
                            attributeId: AttributeId(0),
                        },
                        data: TlvArray(TlvAclTestSchema).encodeTlv([]),
                        dataVersion: 0,
                    },
                },
                {
                    attributeData: {
                        path: {
                            endpointId: EndpointNumber(0),
                            clusterId: ClusterId(0x1f),
                            attributeId: AttributeId(0),
                            listIndex: 0,
                        },
                        data: TlvAclTestSchema.encodeTlv({
                            privilege: 1,
                            authMode: 2,
                            subjects: null,
                            targets: null,
                        }),
                        dataVersion: 0,
                    },
                },
                {
                    attributeData: {
                        path: {
                            endpointId: EndpointNumber(0),
                            clusterId: ClusterId(0x1f),
                            attributeId: AttributeId(0),
                            listIndex: 1,
                        },
                        data: TlvAclTestSchema.encodeTlv({
                            privilege: 2,
                            authMode: 2,
                            subjects: null,
                            targets: null,
                        }),
                        dataVersion: 0,
                    },
                },
            ];
            const normalizedData = normalizeAndDecodeReadAttributeReport(data);

            expect(normalizedData.length).toBe(1);
            expect(normalizedData[0].path).toEqual({
                attributeId: AttributeId(0),
                attributeName: "acl",
                clusterId: ClusterId(0x1f),
                endpointId: EndpointNumber(0),
                nodeId: undefined,
            });
            expect(normalizedData[0].value).toEqual([
                {
                    privilege: 1,
                    authMode: 2,
                    subjects: null,
                    targets: null,
                },
                {
                    privilege: 2,
                    authMode: 2,
                    subjects: null,
                    targets: null,
                },
            ]);
        });

        it("decode chunked array with indexed deletion", () => {
            const data: TypeFromSchema<typeof TlvAttributeReport>[] = [
                {
                    attributeData: {
                        path: {
                            endpointId: EndpointNumber(0),
                            clusterId: ClusterId(0x1f),
                            attributeId: AttributeId(0),
                        },
                        data: TlvArray(TlvAclTestSchema).encodeTlv([]),
                        dataVersion: 0,
                    },
                },
                {
                    attributeData: {
                        path: {
                            endpointId: EndpointNumber(0),
                            clusterId: ClusterId(0x1f),
                            attributeId: AttributeId(0),
                            listIndex: 0,
                        },
                        data: TlvAclTestSchema.encodeTlv({
                            privilege: 1,
                            authMode: 2,
                            subjects: null,
                            targets: null,
                        }),
                        dataVersion: 0,
                    },
                },
                {
                    attributeData: {
                        path: {
                            endpointId: EndpointNumber(0),
                            clusterId: ClusterId(0x1f),
                            attributeId: AttributeId(0),
                            listIndex: 1,
                        },
                        data: TlvAclTestSchema.encodeTlv({
                            privilege: 2,
                            authMode: 2,
                            subjects: null,
                            targets: null,
                        }),
                        dataVersion: 0,
                    },
                },
                {
                    attributeData: {
                        path: {
                            endpointId: EndpointNumber(0),
                            clusterId: ClusterId(0x1f),
                            attributeId: AttributeId(0),
                            listIndex: 2,
                        },
                        data: TlvAclTestSchema.encodeTlv({
                            privilege: 3,
                            authMode: 2,
                            subjects: null,
                            targets: null,
                        }),
                        dataVersion: 0,
                    },
                },
                {
                    attributeData: {
                        path: {
                            endpointId: EndpointNumber(0),
                            clusterId: ClusterId(0x1f),
                            attributeId: AttributeId(0),
                            listIndex: 1,
                        },
                        data: TlvNullable(TlvAclTestSchema).encodeTlv(null),
                        dataVersion: 0,
                    },
                },
            ];
            const normalizedData = normalizeAndDecodeReadAttributeReport(data);

            expect(normalizedData.length).toBe(1);
            expect(normalizedData[0].path).toEqual({
                attributeId: AttributeId(0),
                attributeName: "acl",
                clusterId: ClusterId(0x1f),
                endpointId: EndpointNumber(0),
                nodeId: undefined,
            });
            expect(normalizedData[0].value).toEqual([
                {
                    privilege: 1,
                    authMode: 2,
                    subjects: null,
                    targets: null,
                },
                {
                    privilege: 3,
                    authMode: 2,
                    subjects: null,
                    targets: null,
                },
            ]);
        });

        it("decode chunked array with indexed modify", () => {
            const data: TypeFromSchema<typeof TlvAttributeReport>[] = [
                {
                    attributeData: {
                        path: {
                            endpointId: EndpointNumber(0),
                            clusterId: ClusterId(0x1f),
                            attributeId: AttributeId(0),
                        },
                        data: TlvArray(TlvAclTestSchema).encodeTlv([]),
                        dataVersion: 0,
                    },
                },
                {
                    attributeData: {
                        path: {
                            endpointId: EndpointNumber(0),
                            clusterId: ClusterId(0x1f),
                            attributeId: AttributeId(0),
                            listIndex: 0,
                        },
                        data: TlvAclTestSchema.encodeTlv({
                            privilege: 1,
                            authMode: 2,
                            subjects: null,
                            targets: null,
                        }),
                        dataVersion: 0,
                    },
                },
                {
                    attributeData: {
                        path: {
                            endpointId: EndpointNumber(0),
                            clusterId: ClusterId(0x1f),
                            attributeId: AttributeId(0),
                            listIndex: 1,
                        },
                        data: TlvAclTestSchema.encodeTlv({
                            privilege: 2,
                            authMode: 2,
                            subjects: null,
                            targets: null,
                        }),
                        dataVersion: 0,
                    },
                },
                {
                    attributeData: {
                        path: {
                            endpointId: EndpointNumber(0),
                            clusterId: ClusterId(0x1f),
                            attributeId: AttributeId(0),
                            listIndex: 2,
                        },
                        data: TlvAclTestSchema.encodeTlv({
                            privilege: 3,
                            authMode: 2,
                            subjects: null,
                            targets: null,
                        }),
                        dataVersion: 0,
                    },
                },
                {
                    attributeData: {
                        path: {
                            endpointId: EndpointNumber(0),
                            clusterId: ClusterId(0x1f),
                            attributeId: AttributeId(0),
                            listIndex: 1,
                        },
                        data: TlvAclTestSchema.encodeTlv({
                            privilege: 4,
                            authMode: 2,
                            subjects: null,
                            targets: null,
                        }),
                        dataVersion: 0,
                    },
                },
            ];
            const normalizedData = normalizeAndDecodeReadAttributeReport(data);

            expect(normalizedData.length).toBe(1);
            expect(normalizedData[0].path).toEqual({
                attributeId: AttributeId(0),
                attributeName: "acl",
                clusterId: ClusterId(0x1f),
                endpointId: EndpointNumber(0),
                nodeId: undefined,
            });
            expect(normalizedData[0].value).toEqual([
                {
                    privilege: 1,
                    authMode: 2,
                    subjects: null,
                    targets: null,
                },
                {
                    privilege: 4,
                    authMode: 2,
                    subjects: null,
                    targets: null,
                },
                {
                    privilege: 3,
                    authMode: 2,
                    subjects: null,
                    targets: null,
                },
            ]);
        });
    });

    describe("decode raw data taken from chip.tool", () => {
        it("decode chunked array", () => {
            // Data taken from chiptool lighting device
            const tlvData = ByteArray.fromHex(
                "1536011535012600605bd045370124020024031d2404011836021818181535012600605bd045370124020024031d24040134051824020418181535012600605bd045370124020024031d24040134051824021d18181535012600605bd045370124020024031d24040134051824021f18181535012600605bd045370124020024031d24040134051824022818181535012600605bd045370124020024031d24040134051824022a18181535012600605bd045370124020024031d24040134051824022b18181535012600605bd045370124020024031d24040134051824022c18181535012600605bd045370124020024031d24040134051824023018181535012600605bd045370124020024031d24040134051824023118181535012600605bd045370124020024031d24040134051824023218181535012600605bd045370124020024031d24040134051824023318181535012600605bd045370124020024031d24040134051824023418181535012600605bd045370124020024031d24040134051824023518181535012600605bd045370124020024031d24040134051824023618181535012600605bd045370124020024031d24040134051824023718181535012600605bd045370124020024031d24040134051824023b18181535012600605bd045370124020024031d24040134051824023c18181535012600605bd045370124020024031d24040134051824023e18181535012600605bd045370124020024031d24040134051824023f18181535012600605bd045370124020024031d24040134051824024018181535012600605bd045370124020024031d240401340518240241181818290424ff0118",
            );
            const decodedData = TlvDataReport.decode(tlvData);

            expect(decodedData).toBeTruthy();
            expect(Array.isArray(decodedData.attributeReports)).toBeTruthy();
            if (!decodedData.attributeReports) return;

            const normalizedData = normalizeAndDecodeReadAttributeReport(decodedData.attributeReports);

            expect(normalizedData.length).toBe(1);
            expect(normalizedData[0].path).toEqual({
                attributeId: AttributeId(1),
                attributeName: "serverList",
                clusterId: ClusterId(29),
                endpointId: EndpointNumber(0),
                nodeId: undefined,
            });
            expect(normalizedData[0].value).toEqual([
                ClusterId(4),
                ClusterId(29),
                ClusterId(31),
                ClusterId(40),
                ClusterId(42),
                ClusterId(43),
                ClusterId(44),
                ClusterId(48),
                ClusterId(49),
                ClusterId(50),
                ClusterId(51),
                ClusterId(52),
                ClusterId(53),
                ClusterId(54),
                ClusterId(55),
                ClusterId(59),
                ClusterId(60),
                ClusterId(62),
                ClusterId(63),
                ClusterId(64),
                ClusterId(65),
            ]);
        });

        it("decode number attribute", () => {
            // Data taken from chiptool lighting device
            const tlvData = ByteArray.fromHex(
                "153601153501260055156878370124020024032824040918240201181818290424ff0118",
            );
            const decodedData = TlvDataReport.decode(tlvData);

            expect(decodedData).toBeTruthy();
            expect(Array.isArray(decodedData.attributeReports)).toBeTruthy();
            if (!decodedData.attributeReports) return;

            const normalizedData = normalizeAndDecodeReadAttributeReport(decodedData.attributeReports);

            expect(normalizedData.length).toBe(1);
            expect(normalizedData[0].path).toEqual({
                attributeId: AttributeId(9),
                attributeName: "softwareVersion",
                clusterId: ClusterId(40),
                endpointId: EndpointNumber(0),
                nodeId: undefined,
            });
            expect(normalizedData[0].value).toEqual(1);
        });

        it("decode whole cluster response", () => {
            // Data taken from chiptool lighting device
            const tlvData = ByteArray.fromHex(
                "15360115350126005515687837012402002403282404001824020118181535012600551568783701240200240328240401182c020b544553545f56454e444f5218181535012600551568783701240200240328240402182502f1ff18181535012600551568783701240200240328240403182c020c544553545f50524f4455435418181535012600551568783701240200240328240404182502018018181535012600551568783701240200240328240405182c020018181535012600551568783701240200240328240406182c02025553181815350126005515687837012402002403282404071824020018181535012600551568783701240200240328240408182c020c544553545f56455253494f4e18181535012600551568783701240200240328240409182402011818153501260055156878370124020024032824040a182c0203312e301818153501260055156878370124020024032824040b182c020832303230303130311818153501260055156878370124020024032824040c182c02001818153501260055156878370124020024032824040d182c02001818153501260055156878370124020024032824040e182c02001818153501260055156878370124020024032824040f182c0207544553545f534e181815350126005515687837012402002403282404101828021818153501260055156878370124020024032824041118290218181535012600551568783701240200240328240412182c021032354536333242424137354642453943181815350126005515687837012402002403282404131835022400032501ffff18181815350126005515687837012402002403282504fcff18240200181815350126005515687837012402002403282504fdff18240201181815350126005515687837012402002403282504f8ff18360218181815350126005515687837012402002403282504f9ff18360218181815350126005515687837012402002403282504faff18360218181815350126005515687837012402002403282504faff340518240200181815350126005515687837012402002403282504faff340518240201181815350126005515687837012402002403282504faff340518240202181815350126005515687837012402002403282504fbff18360218181815350126005515687837012402002403282504fbff340518240200181815350126005515687837012402002403282504fbff340518240201181815350126005515687837012402002403282504fbff340518240202181815350126005515687837012402002403282504fbff340518240203181815350126005515687837012402002403282504fbff340518240204181818290324ff0118",
            );
            const decodedData = TlvDataReport.decode(tlvData);

            expect(decodedData).toBeTruthy();
            expect(Array.isArray(decodedData.attributeReports)).toBeTruthy();
            if (!decodedData.attributeReports) return;

            const normalizedData = normalizeAndDecodeReadAttributeReport(decodedData.attributeReports);

            expect(normalizedData).toEqual([
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 0,
                        attributeName: "dataModelRevision",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: 1,
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 1,
                        attributeName: "vendorName",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "TEST_VENDOR",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 2,
                        attributeName: "vendorId",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: VendorId(65521),
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 3,
                        attributeName: "productName",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "TEST_PRODUCT",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 4,
                        attributeName: "productId",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: 32769,
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 5,
                        attributeName: "nodeLabel",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 6,
                        attributeName: "location",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "US",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 7,
                        attributeName: "hardwareVersion",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: 0,
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 8,
                        attributeName: "hardwareVersionString",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "TEST_VERSION",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 9,
                        attributeName: "softwareVersion",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: 1,
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 10,
                        attributeName: "softwareVersionString",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "1.0",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 11,
                        attributeName: "manufacturingDate",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "20200101",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 12,
                        attributeName: "partNumber",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 13,
                        attributeName: "productUrl",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 14,
                        attributeName: "productLabel",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 15,
                        attributeName: "serialNumber",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "TEST_SN",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 16,
                        attributeName: "localConfigDisabled",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: false,
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 17,
                        attributeName: "reachable",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: true,
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 18,
                        attributeName: "uniqueId",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "25E632BBA75FBE9C",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 19,
                        attributeName: "capabilityMinima",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: {
                        caseSessionsPerFabric: 3,
                        subscriptionsPerFabric: 65535,
                    },
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 65532,
                        attributeName: "featureMap",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: {},
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 65533,
                        attributeName: "clusterRevision",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: 1,
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 65528,
                        attributeName: "generatedCommandList",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: [],
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 65529,
                        attributeName: "acceptedCommandList",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: [],
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 65530,
                        attributeName: "eventList",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: [EventId(0), EventId(1), EventId(2)],
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 65531,
                        attributeName: "attributeList",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: [AttributeId(0), AttributeId(1), AttributeId(2), AttributeId(3), AttributeId(4)],
                },
            ]);
        });
    });

    describe("decodeUnknownAttributeValueWithSchema", () => {
        it("decode number attribute as unknown", () => {
            // Data taken from chiptool lighting device
            const tlvData = ByteArray.fromHex(
                "153601153501260055156878370124020024032824040918240201181818290424ff0118",
            );
            const decodedData = TlvDataReport.decode(tlvData);

            expect(decodedData).toBeTruthy();
            expect(Array.isArray(decodedData.attributeReports)).toBeTruthy();
            if (!decodedData.attributeReports) return;

            const dataValues = decodedData.attributeReports.flatMap(({ attributeData }) =>
                attributeData !== undefined ? attributeData : [],
            );
            const normalizedData = normalizeAttributeData(dataValues, false);

            const decodedAnyData = decodeUnknownAttributeValue(normalizedData[0]);

            expect(decodedAnyData).toEqual(1);
        });

        it("decode object attribute as unknown", () => {
            const data: TypeFromSchema<typeof TlvAttributeData>[] = [
                {
                    path: {
                        endpointId: EndpointNumber(0),
                        clusterId: ClusterId(0x1f),
                        attributeId: AttributeId(0),
                        listIndex: undefined,
                    },
                    data: TlvAclTestSchema.encodeTlv({
                        privilege: 1,
                        authMode: 2,
                        subjects: null,
                        targets: null,
                    }),
                    dataVersion: 0,
                },
            ];

            const decodedAnyData = decodeUnknownAttributeValue(data);

            expect(decodedAnyData).toEqual({ "1": 1, "2": 2, "3": null, "4": null });
        });

        it("decode object array attribute as unknown", () => {
            const data: TypeFromSchema<typeof TlvAttributeData>[] = [
                {
                    path: {
                        endpointId: EndpointNumber(0),
                        clusterId: ClusterId(0x1f),
                        attributeId: AttributeId(0),
                        listIndex: undefined,
                    },
                    data: TlvAclTestArraySchema.encodeTlv([
                        {
                            privilege: 1,
                            authMode: 2,
                            subjects: null,
                            targets: null,
                        },
                        {
                            privilege: 3,
                            authMode: 4,
                            subjects: 5,
                            targets: 6,
                        },
                    ]),
                    dataVersion: 0,
                },
            ];

            const decodedAnyData = decodeUnknownAttributeValue(data);

            expect(decodedAnyData).toEqual([
                { "1": 1, "2": 2, "3": null, "4": null },
                { "1": 3, "2": 4, "3": 5, "4": 6 },
            ]);
        });

        it("decode object chunked array attribute as unknown", () => {
            const data: TypeFromSchema<typeof TlvAttributeData>[] = [
                {
                    path: { endpointId: EndpointNumber(0), clusterId: ClusterId(0x1f), attributeId: AttributeId(0) },
                    data: TlvArray(TlvAclTestSchema).encodeTlv([]),
                    dataVersion: 0,
                },
                {
                    path: {
                        endpointId: EndpointNumber(0),
                        clusterId: ClusterId(0x1f),
                        attributeId: AttributeId(0),
                        listIndex: 0,
                    },
                    data: TlvAclTestSchema.encodeTlv({
                        privilege: 1,
                        authMode: 2,
                        subjects: null,
                        targets: null,
                    }),
                    dataVersion: 0,
                },
                {
                    path: {
                        endpointId: EndpointNumber(0),
                        clusterId: ClusterId(0x1f),
                        attributeId: AttributeId(0),
                        listIndex: 1,
                    },
                    data: TlvAclTestSchema.encodeTlv({
                        privilege: 2,
                        authMode: 2,
                        subjects: null,
                        targets: 6,
                    }),
                    dataVersion: 0,
                },
            ];

            const decodedAnyData = decodeUnknownAttributeValue(data);

            expect(decodedAnyData).toEqual([
                { "1": 1, "2": 2, "3": null, "4": null },
                { "1": 2, "2": 2, "3": null, "4": 6 },
            ]);
        });
    });

    describe("normalizeAttributeData", () => {
        it("normalize data with all paths given for one endpoint", () => {
            const data: TypeFromSchema<typeof TlvAttributeData>[] = [
                {
                    path: { endpointId: EndpointNumber(0), clusterId: ClusterId(0x1f), attributeId: AttributeId(0) },
                    data: TlvArray(TlvAclTestSchema).encodeTlv([]),
                    dataVersion: 0,
                },
                {
                    path: {
                        endpointId: EndpointNumber(0),
                        clusterId: ClusterId(0x1f),
                        attributeId: AttributeId(0),
                        listIndex: 0,
                    },
                    data: TlvAclTestSchema.encodeTlv({
                        privilege: 1,
                        authMode: 2,
                        subjects: null,
                        targets: null,
                    }),
                    dataVersion: 0,
                },
                {
                    path: {
                        endpointId: EndpointNumber(0),
                        clusterId: ClusterId(0x1f),
                        attributeId: AttributeId(0),
                        listIndex: 1,
                    },
                    data: TlvAclTestSchema.encodeTlv({
                        privilege: 2,
                        authMode: 2,
                        subjects: null,
                        targets: null,
                    }),
                    dataVersion: 0,
                },
            ];

            const normalized = normalizeAttributeData(data);

            expect(normalized).toEqual([data]);
        });

        it("normalize data with all paths given for two endpoints", () => {
            const data1: TypeFromSchema<typeof TlvAttributeData>[] = [
                {
                    path: { endpointId: EndpointNumber(0), clusterId: ClusterId(0x1f), attributeId: AttributeId(0) },
                    data: TlvArray(TlvAclTestSchema).encodeTlv([]),
                    dataVersion: 0,
                },
                {
                    path: {
                        endpointId: EndpointNumber(0),
                        clusterId: ClusterId(0x1f),
                        attributeId: AttributeId(0),
                        listIndex: 0,
                    },
                    data: TlvAclTestSchema.encodeTlv({
                        privilege: 1,
                        authMode: 2,
                        subjects: null,
                        targets: null,
                    }),
                    dataVersion: 0,
                },
                {
                    path: {
                        endpointId: EndpointNumber(0),
                        clusterId: ClusterId(0x1f),
                        attributeId: AttributeId(0),
                        listIndex: 1,
                    },
                    data: TlvAclTestSchema.encodeTlv({
                        privilege: 2,
                        authMode: 2,
                        subjects: null,
                        targets: null,
                    }),
                    dataVersion: 0,
                },
            ];
            const data2: TypeFromSchema<typeof TlvAttributeData>[] = [
                {
                    path: { endpointId: EndpointNumber(0), clusterId: ClusterId(0x1f), attributeId: AttributeId(1) },
                    data: TlvArray(TlvAclTestSchema).encodeTlv([]),
                    dataVersion: 0,
                },
            ];

            const normalized = normalizeAttributeData([...data1, ...data2]);

            expect(normalized).toEqual([data1, data2]);
        });

        it("normalize data with all paths given for two endpoints with enabledtagCompression", () => {
            const data1: TypeFromSchema<typeof TlvAttributeData>[] = [
                {
                    path: { endpointId: EndpointNumber(0), clusterId: ClusterId(0x1f), attributeId: AttributeId(0) },
                    data: TlvArray(TlvAclTestSchema).encodeTlv([]),
                    dataVersion: 0,
                },
                {
                    path: { enableTagCompression: true, listIndex: 0 },
                    data: TlvAclTestSchema.encodeTlv({
                        privilege: 1,
                        authMode: 2,
                        subjects: null,
                        targets: null,
                    }),
                    dataVersion: 0,
                },
                {
                    path: { enableTagCompression: true, listIndex: 1 },
                    data: TlvAclTestSchema.encodeTlv({
                        privilege: 2,
                        authMode: 2,
                        subjects: null,
                        targets: null,
                    }),
                    dataVersion: 0,
                },
            ];
            const data2: TypeFromSchema<typeof TlvAttributeData>[] = [
                {
                    path: { enableTagCompression: true, attributeId: AttributeId(1) },
                    data: TlvArray(TlvAclTestSchema).encodeTlv([]),
                    dataVersion: 0,
                },
            ];

            const resultData1 = data1;
            resultData1[1].path = {
                endpointId: EndpointNumber(0),
                clusterId: ClusterId(0x1f),
                attributeId: AttributeId(0),
                listIndex: 0,
                enableTagCompression: true,
            };
            resultData1[2].path = {
                endpointId: EndpointNumber(0),
                clusterId: ClusterId(0x1f),
                attributeId: AttributeId(0),
                listIndex: 1,
                enableTagCompression: true,
            };
            const resultData2 = data2;
            resultData2[0].path = {
                endpointId: EndpointNumber(0),
                clusterId: ClusterId(0x1f),
                attributeId: AttributeId(1),
                enableTagCompression: true,
            };

            const normalized = normalizeAttributeData([...data1, ...data2]);

            expect(normalized).toEqual([resultData1, resultData2]);
        });
    });

    /*
    describe("Unknown with global manipulation", () => {
        it("decode whole cluster response as unknown", () => {
            // Data taken from chiptool lighting device
            const tlvData = ByteArray.fromHex(
                "15360115350126005515687837012402002403282404001824020118181535012600551568783701240200240328240401182c020b544553545f56454e444f5218181535012600551568783701240200240328240402182502f1ff18181535012600551568783701240200240328240403182c020c544553545f50524f4455435418181535012600551568783701240200240328240404182502018018181535012600551568783701240200240328240405182c020018181535012600551568783701240200240328240406182c02025553181815350126005515687837012402002403282404071824020018181535012600551568783701240200240328240408182c020c544553545f56455253494f4e18181535012600551568783701240200240328240409182402011818153501260055156878370124020024032824040a182c0203312e301818153501260055156878370124020024032824040b182c020832303230303130311818153501260055156878370124020024032824040c182c02001818153501260055156878370124020024032824040d182c02001818153501260055156878370124020024032824040e182c02001818153501260055156878370124020024032824040f182c0207544553545f534e181815350126005515687837012402002403282404101828021818153501260055156878370124020024032824041118290218181535012600551568783701240200240328240412182c021032354536333242424137354642453943181815350126005515687837012402002403282404131835022400032501ffff18181815350126005515687837012402002403282504fcff18240200181815350126005515687837012402002403282504fdff18240201181815350126005515687837012402002403282504f8ff18360218181815350126005515687837012402002403282504f9ff18360218181815350126005515687837012402002403282504faff18360218181815350126005515687837012402002403282504faff340518240200181815350126005515687837012402002403282504faff340518240201181815350126005515687837012402002403282504faff340518240202181815350126005515687837012402002403282504fbff18360218181815350126005515687837012402002403282504fbff340518240200181815350126005515687837012402002403282504fbff340518240201181815350126005515687837012402002403282504fbff340518240202181815350126005515687837012402002403282504fbff340518240203181815350126005515687837012402002403282504fbff340518240204181818290324ff0118",
            );
            const decodedData = TlvDataReport.decode(tlvData);

            expect(decodedData).toBeTruthy();
            expect(Array.isArray(decodedData.attributeReports)).toBeTruthy();
            if (!decodedData.attributeReports) return;

            // Store and Clear AllClustersMap to make sure anything is unknown
            const originalAllClustersMap = { ...AllClustersMap };
            for (const clusterId of Object.keys(AllClustersMap)) {
                delete AllClustersMap[ClusterId(parseInt(clusterId))];
            }
            const normalizedData = normalizeAndDecodeReadAttributeReport(decodedData.attributeReports);

            expect(normalizedData).toEqual([
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 0,
                        attributeName: "Unknown (0x0)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: 1,
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 1,
                        attributeName: "Unknown (0x1)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "TEST_VENDOR",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 2,
                        attributeName: "Unknown (0x2)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: 65521,
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 3,
                        attributeName: "Unknown (0x3)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "TEST_PRODUCT",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 4,
                        attributeName: "Unknown (0x4)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: 32769,
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 5,
                        attributeName: "Unknown (0x5)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 6,
                        attributeName: "Unknown (0x6)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "US",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 7,
                        attributeName: "Unknown (0x7)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: 0,
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 8,
                        attributeName: "Unknown (0x8)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "TEST_VERSION",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 9,
                        attributeName: "Unknown (0x9)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: 1,
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 10,
                        attributeName: "Unknown (0xa)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "1.0",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 11,
                        attributeName: "Unknown (0xb)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "20200101",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 12,
                        attributeName: "Unknown (0xc)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 13,
                        attributeName: "Unknown (0xd)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 14,
                        attributeName: "Unknown (0xe)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 15,
                        attributeName: "Unknown (0xf)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "TEST_SN",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 16,
                        attributeName: "Unknown (0x10)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: false,
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 17,
                        attributeName: "Unknown (0x11)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: true,
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 18,
                        attributeName: "Unknown (0x12)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: "25E632BBA75FBE9C",
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 19,
                        attributeName: "Unknown (0x13)",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: {
                        "0": 3,
                        "1": 65535,
                    },
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 65532,
                        attributeName: "featureMap",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: {},
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 65533,
                        attributeName: "clusterRevision",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: 1,
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 65528,
                        attributeName: "generatedCommandList",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: [],
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 65529,
                        attributeName: "acceptedCommandList",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: [],
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 65530,
                        attributeName: "eventList",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: [0, 1, 2],
                },
                {
                    path: {
                        endpointId: 0,
                        clusterId: 40,
                        attributeId: 65531,
                        attributeName: "attributeList",
                        nodeId: undefined,
                    },
                    version: 2020087125,
                    value: [0, 1, 2, 3, 4],
                },
            ]);

            for (const clusterId of Object.keys(originalAllClustersMap)) {
                const key = ClusterId(parseInt(clusterId));
                AllClustersMap[key] = originalAllClustersMap[key];
            }
        });
    });*/
});
