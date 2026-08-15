/*
    WikiMind model.js

    Browser-only Transformer model.
    No Node.js.
    No hard-coded answer templates.

    IMPORTANT:
    Random weights are not a trained AI.
    The model only generates text after trained
    weights are loaded.
*/

export const CONFIG = {
    vocabSize: 4096,
    contextSize: 128,
    embeddingSize: 64,
    hiddenSize: 128,
    layers: 4,
    heads: 4
};


/* =========================================================
   Math
========================================================= */

function randomWeights(size, scale = 0.02) {

    const data = new Float32Array(size);

    for (let i = 0; i < size; i++) {
        data[i] =
            (Math.random() * 2 - 1) * scale;
    }

    return data;
}


function matmul(input, weights, rows, cols) {

    const output = new Float32Array(cols);

    for (let j = 0; j < cols; j++) {

        let sum = 0;

        for (let i = 0; i < rows; i++) {

            sum +=
                input[i] *
                weights[i * cols + j];
        }

        output[j] = sum;
    }

    return output;
}


function add(a, b) {

    const result =
        new Float32Array(a.length);

    for (let i = 0; i < a.length; i++) {
        result[i] = a[i] + b[i];
    }

    return result;
}


function relu(x) {

    const result =
        new Float32Array(x.length);

    for (let i = 0; i < x.length; i++) {
        result[i] = Math.max(0, x[i]);
    }

    return result;
}


function softmax(values) {

    const result =
        new Float32Array(values.length);

    let max = -Infinity;

    for (let i = 0; i < values.length; i++) {

        if (values[i] > max) {
            max = values[i];
        }
    }

    let total = 0;

    for (let i = 0; i < values.length; i++) {

        result[i] =
            Math.exp(values[i] - max);

        total += result[i];
    }

    if (total === 0) {
        return result;
    }

    for (let i = 0; i < result.length; i++) {
        result[i] /= total;
    }

    return result;
}


/* =========================================================
   Byte tokenizer
========================================================= */

export class Tokenizer {

    constructor() {

        this.BOS = 256;
        this.EOS = 257;
        this.PAD = 258;
        this.UNK = 259;
    }


    encode(text) {

        const bytes =
            new TextEncoder().encode(text);

        return Array.from(bytes);
    }


    decode(tokens) {

        const bytes = [];

        for (const token of tokens) {

            if (
                token >= 0 &&
                token <= 255
            ) {
                bytes.push(token);
            }
        }

        if (bytes.length === 0) {
            return "";
        }

        try {

            return new TextDecoder().decode(
                new Uint8Array(bytes)
            );

        } catch {

            return "";
        }
    }
}


/* =========================================================
   Attention
========================================================= */

class Attention {

    constructor() {

        const E =
            CONFIG.embeddingSize;

        this.q =
            randomWeights(E * E);

        this.k =
            randomWeights(E * E);

        this.v =
            randomWeights(E * E);

        this.output =
            randomWeights(E * E);
    }


    forward(sequence) {

        const result = [];

        for (
            let position = 0;
            position < sequence.length;
            position++
        ) {

            const query =
                matmul(
                    sequence[position],
                    this.q,
                    CONFIG.embeddingSize,
                    CONFIG.embeddingSize
                );

            const scores = [];

            for (
                let j = 0;
                j <= position;
                j++
            ) {

                const key =
                    matmul(
                        sequence[j],
                        this.k,
                        CONFIG.embeddingSize,
                        CONFIG.embeddingSize
                    );

                let score = 0;

                for (
                    let i = 0;
                    i < CONFIG.embeddingSize;
                    i++
                ) {

                    score +=
                        query[i] * key[i];
                }

                score /=
                    Math.sqrt(
                        CONFIG.embeddingSize
                    );

                scores.push(score);
            }


            const probabilities =
                softmax(
                    Float32Array.from(scores)
                );


            const context =
                new Float32Array(
                    CONFIG.embeddingSize
                );


            for (
                let j = 0;
                j <= position;
                j++
            ) {

                const value =
                    matmul(
                        sequence[j],
                        this.v,
                        CONFIG.embeddingSize,
                        CONFIG.embeddingSize
                    );

                for (
                    let i = 0;
                    i < CONFIG.embeddingSize;
                    i++
                ) {

                    context[i] +=
                        value[i] *
                        probabilities[j];
                }
            }


            result.push(
                matmul(
                    context,
                    this.output,
                    CONFIG.embeddingSize,
                    CONFIG.embeddingSize
                )
            );
        }

        return result;
    }
}


/* =========================================================
   Transformer block
========================================================= */

class TransformerBlock {

    constructor() {

        this.attention =
            new Attention();

        this.ff1 =
            randomWeights(
                CONFIG.embeddingSize *
                CONFIG.hiddenSize
            );

        this.ff2 =
            randomWeights(
                CONFIG.hiddenSize *
                CONFIG.embeddingSize
            );
    }


    forward(sequence) {

        const attention =
            this.attention.forward(sequence);

        const residual = [];

        for (
            let i = 0;
            i < sequence.length;
            i++
        ) {

            residual.push(
                add(
                    sequence[i],
                    attention[i]
                )
            );
        }


        const output = [];

        for (
            let i = 0;
            i < residual.length;
            i++
        ) {

            const hidden =
                relu(
                    matmul(
                        residual[i],
                        this.ff1,
                        CONFIG.embeddingSize,
                        CONFIG.hiddenSize
                    )
                );


            const feedForward =
                matmul(
                    hidden,
                    this.ff2,
                    CONFIG.hiddenSize,
                    CONFIG.embeddingSize
                );


            output.push(
                add(
                    residual[i],
                    feedForward
                )
            );
        }

        return output;
    }
}


/* =========================================================
   Main model
========================================================= */

export class WikiMindModel {

    constructor() {

        const E =
            CONFIG.embeddingSize;


        this.embeddings =
            randomWeights(
                CONFIG.vocabSize * E
            );


        this.positions =
            randomWeights(
                CONFIG.contextSize * E
            );


        this.layers = [];

        for (
            let i = 0;
            i < CONFIG.layers;
            i++
        ) {

            this.layers.push(
                new TransformerBlock()
            );
        }


        this.lmHead =
            randomWeights(
                E * CONFIG.vocabSize
            );


        /*
            Random weights are not useful
            for language generation.
        */

        this.trained = false;
    }


    embedding(token) {

        const safeToken =
            Math.max(
                0,
                Math.min(
                    token,
                    CONFIG.vocabSize - 1
                )
            );


        const start =
            safeToken *
            CONFIG.embeddingSize;


        return this.embeddings.slice(
            start,
            start + CONFIG.embeddingSize
        );
    }


    position(index) {

        const safeIndex =
            Math.min(
                index,
                CONFIG.contextSize - 1
            );


        const start =
            safeIndex *
            CONFIG.embeddingSize;


        return this.positions.slice(
            start,
            start + CONFIG.embeddingSize
        );
    }


    forward(tokens) {

        if (!tokens.length) {

            return new Float32Array(
                CONFIG.embeddingSize
            );
        }


        const length =
            Math.min(
                tokens.length,
                CONFIG.contextSize
            );


        const sequence = [];


        for (
            let i = 0;
            i < length;
            i++
        ) {

            sequence.push(
                add(
                    this.embedding(tokens[i]),
                    this.position(i)
                )
            );
        }


        let output = sequence;


        for (const layer of this.layers) {

            output =
                layer.forward(output);
        }


        return output[
            output.length - 1
        ];
    }


    logits(hidden) {

        return matmul(
            hidden,
            this.lmHead,
            CONFIG.embeddingSize,
            CONFIG.vocabSize
        );
    }


    predict(tokens) {

        const hidden =
            this.forward(tokens);

        const logits =
            this.logits(hidden);

        return softmax(logits);
    }


    sample(probabilities, temperature = 0.8) {

        let total = 0;

        const adjusted =
            new Float32Array(
                probabilities.length
            );


        for (
            let i = 0;
            i < probabilities.length;
            i++
        ) {

            adjusted[i] =
                Math.pow(
                    Math.max(
                        probabilities[i],
                        1e-12
                    ),
                    1 / temperature
                );

            total += adjusted[i];
        }


        let randomValue =
            Math.random() * total;


        for (
            let i = 0;
            i < adjusted.length;
            i++
        ) {

            randomValue -= adjusted[i];

            if (randomValue <= 0) {
                return i;
            }
        }


        return 0;
    }


    generate(
        prompt,
        tokenizer,
        maxTokens = 80,
        temperature = 0.8
    ) {

        /*
            Prevent meaningless output
            from random weights.
        */

        if (!this.trained) {
            return null;
        }


        let tokens =
            tokenizer.encode(prompt);


        if (tokens.length === 0) {
            tokens = [tokenizer.BOS];
        }


        for (
            let i = 0;
            i < maxTokens;
            i++
        ) {

            const context =
                tokens.slice(
                    -CONFIG.contextSize
                );


            const probabilities =
                this.predict(context);


            const next =
                this.sample(
                    probabilities,
                    temperature
                );


            /*
                Only byte tokens are valid
                text output.
            */

            if (
                next >= 0 &&
                next <= 255
            ) {

                tokens.push(next);

            } else if (
                next === tokenizer.EOS
            ) {

                break;
            }
        }


        return tokenizer.decode(tokens);
    }


    /* =====================================================
       Load trained weights
    ===================================================== */

    async loadWeights(url) {

        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Could not load model weights: " +
                response.status
            );
        }


        const data =
            await response.json();


        if (Array.isArray(data.embeddings)) {

            this.embeddings =
                Float32Array.from(
                    data.embeddings
                );
        }


        if (Array.isArray(data.positions)) {

            this.positions =
                Float32Array.from(
                    data.positions
                );
        }


        if (Array.isArray(data.lmHead)) {

            this.lmHead =
                Float32Array.from(
                    data.lmHead
                );
        }


        /*
            Transformer layers.
        */

        if (Array.isArray(data.layers)) {

            for (
                let i = 0;
                i < this.layers.length;
                i++
            ) {

                const source =
                    data.layers[i];

                if (!source) {
                    continue;
                }


                const target =
                    this.layers[i];


                if (Array.isArray(source.ff1)) {

                    target.ff1 =
                        Float32Array.from(
                            source.ff1
                        );
                }


                if (Array.isArray(source.ff2)) {

                    target.ff2 =
                        Float32Array.from(
                            source.ff2
                        );
                }


                if (
                    source.attention &&
                    Array.isArray(
                        source.attention.q
                    )
                ) {

                    target.attention.q =
                        Float32Array.from(
                            source.attention.q
                        );
                }


                if (
                    source.attention &&
                    Array.isArray(
                        source.attention.k
                    )
                ) {

                    target.attention.k =
                        Float32Array.from(
                            source.attention.k
                        );
                }


                if (
                    source.attention &&
                    Array.isArray(
                        source.attention.v
                    )
                ) {

                    target.attention.v =
                        Float32Array.from(
                            source.attention.v
                        );
                }


                if (
                    source.attention &&
                    Array.isArray(
                        source.attention.output
                    )
                ) {

                    target.attention.output =
                        Float32Array.from(
                            source.attention.output
                        );
                }
            }
        }


        /*
            Only mark the model trained if
            the essential weights exist.
        */

        if (
            Array.isArray(data.embeddings) &&
            Array.isArray(data.lmHead)
        ) {

            this.trained = true;
        }


        console.log(
            "WikiMind model loaded.",
            {
                trained: this.trained
            }
        );
    }
}


/* =========================================================
   Shared instances
========================================================= */

export const tokenizer =
    new Tokenizer();


export const model =
    new WikiMindModel();


/*
    Compatibility with brain.js
*/

export const brain =
    model;


/* =========================================================
   Model information
========================================================= */

export function modelInfo() {

    return {

        vocabulary:
            CONFIG.vocabSize,

        context:
            CONFIG.contextSize,

        embedding:
            CONFIG.embeddingSize,

        hidden:
            CONFIG.hiddenSize,

        layers:
            CONFIG.layers,

        heads:
            CONFIG.heads,

        trained:
            model.trained
    };
}