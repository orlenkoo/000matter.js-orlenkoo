/**
 * @license
 * Copyright 2022-2023 Project CHIP Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/*** THIS FILE IS GENERATED, DO NOT EDIT ***/

import { ClusterComponent } from "../../cluster/ClusterFactory.js";
import { Attribute } from "../../cluster/Cluster.js";
import { TlvArray } from "../../tlv/TlvArray.js";
import { TlvObject, TlvField } from "../../tlv/TlvObject.js";
import { TlvString } from "../../tlv/TlvString.js";
import { MatterCoreSpecificationV1_1 } from "../../spec/Specifications.js";

export namespace Label {
    /**
     * This is a string tuple with strings that are user defined.
     *
     * @see {@link MatterCoreSpecificationV1_1} § 9.7.4.1
     */
    export const TlvLabelStruct = TlvObject({
        /**
         * The Label or Value semantic is not defined here. Label examples: "room", "zone", "group", "direction".
         *
         * @see {@link MatterCoreSpecificationV1_1} § 9.7.4.1.1
         */
        label: TlvField(0, TlvString.bound({ maxLength: 16 })),

        /**
         * The Label or Value semantic is not defined here. The Value is a discriminator for a Label that may have
         * multiple instances. Label:Value examples: "room":"bedroom 2", "orientation":"North", "floor":"2",
         * "direction":"up"
         *
         * @see {@link MatterCoreSpecificationV1_1} § 9.7.4.1.2
         */
        value: TlvField(1, TlvString.bound({ maxLength: 16 }))
    });

    /**
     * Label is a derived cluster, not to be used directly. These elements are present in all clusters derived from
     * Label.
     */
    export const Base = ClusterComponent({
        attributes: {
            /**
             * This is a list of string tuples. Each entry is a LabelStruct.
             *
             * @see {@link MatterCoreSpecificationV1_1} § 9.7.5.1
             */
            labelList: Attribute(0x0, TlvArray(TlvLabelStruct), { default: [] })
        }
    });
}
