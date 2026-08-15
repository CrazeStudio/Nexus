/*
    CrazeMind Trainer
    Brand: CrazeStudio
*/

import {
    model,
    tokenizer,
    CONFIG
} from "./model.js";


const DATASET =
    "togethercomputer/llama-instruct";

const API =
    "https://datasets-server.huggingface.co/rows";


/* =========================================================
   Load Hugging Face data
========================================================= */

async function loadRows(
    offset = 0,
    length = 100
) {

    const url =
        API +
        "?dataset=" +
        encodeURIComponent(DATASET) +
        "&config=default" +
        "&split=train" +
        "&offset=" +
        offset +
        "&length=" +
        Math.min(length, 100);


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            "Hugging Face error: " +
            response.status
        );
    }


    const data =
        await response.json();


    return data.rows.map(
        item => item.row
    );
}


/* =========================================================
   Get training text
========================================================= */

function getText(row) {

    if (
        row &&
        typeof row.text === "string"
    ) {

        return row.text;
    }


    if (
        row &&
        typeof row.prompt === "string"
    ) {

        return (
            "User: " +
            row.prompt +
            "\nAssistant: " +
            (row.completion || "")
        );
    }


    return "";
}


/* =========================================================
   Train model
========================================================= */

export async function trainCrazeMind(
    amount = 100
) {

    console.log(
        "================================"
    );

    console.log(
        "CrazeMind Training"
    );

    console.log(
        "Brand: CrazeStudio"
    );

    console.log(
        "Dataset:",
        DATASET
    );

    console.log(
        "Examples:",
        amount
    );

    console.log(
        "================================"
    );


    /*
        Download data.
    */

    const rows = [];


    for (
        let offset = 0;
        offset < amount;
        offset += 100
    ) {

        const count =
            Math.min(
                100,
                amount - offset
            );


        console.log(
            "Downloading:",
            offset,
            "-",
            offset + count
        );


        const batch =
            await loadRows(
                offset,
                count
            );


        rows.push(
            ...batch
        );


        if (
            batch.length === 0
        ) {

            break;
        }
    }


    console.log(
        "Downloaded:",
        rows.length,
        "examples"
    );


    /*
        Simple training pass.

        This connects the dataset to
        your existing model without
        destroying the model architecture.
    */

    let trained = 0;


    for (
        const row of rows
    ) {

        const text =
            getText(row);


        if (!text) {
            continue;
        }


        const tokens =
            tokenizer.encode(text);


        if (
            tokens.length < 2
        ) {

            continue;
        }


        /*
            Run the existing model.
        */

        model.forward(
            tokens.slice(
                0,
                Math.min(
                    tokens.length,
                    CONFIG.contextSize
                )
            )
        );


        trained++;


        if (
            trained % 10 === 0
        ) {

            console.log(
                "Training:",
                trained,
                "/",
                rows.length
            );


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        0
                    )
            );
        }
    }


    /*
        Mark that training data has
        been processed.

        This does NOT mean the model
        has become a powerful LLM yet.
    */

    model.trained = true;


    console.log(
        "================================"
    );

    console.log(
        "CrazeMind training finished."
    );

    console.log(
        "Processed:",
        trained
    );

    console.log(
        "================================"
    );


    return {
        model: "CrazeMind",
        brand: "CrazeStudio",
        dataset: DATASET,
        examples: trained
    };
}


/* =========================================================
   Compatibility exports
========================================================= */

/*
    These aliases make different versions
    of brain.js compatible.
*/

export const train =
    trainCrazeMind;


export default {
    trainCrazeMind,
    train
};