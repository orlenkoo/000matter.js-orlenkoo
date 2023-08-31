/**
 * @license
 * Copyright 2022-2023 Project CHIP Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalMatter } from "../local.js";

LocalMatter.children.push({
    tag: "cluster",
    name: "IlluminanceMeasurement",

    children: [
        // Spec defines this as enum8 but then allows other values.
        { tag: "attribute", id: 0x4, name: "LightSensorType", type: "uint8" },
    ],
});
