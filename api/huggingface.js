/*
============================================================
CrazeMind Hugging Face Proxy
CrazeStudio
============================================================
*/

export default async function handler(req, res) {
    // 1. CORS Headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "GET") {
        return res.status(405).json({
            error: "Method not allowed",
            message: `HTTP method ${req.method} is not supported. Use GET.`
        });
    }

    // 2. Query Parameter Extraction (Supports Next.js, Express, and native Node runtimes)
    let queryParams = req.query;

    if (!queryParams || Object.keys(queryParams).length === 0) {
        try {
            const host = req.headers.host || "localhost";
            const parsedUrl = new URL(req.url || "", `http://${host}`);
            queryParams = Object.fromEntries(parsedUrl.searchParams.entries());
        } catch {
            queryParams = {};
        }
    }

    const dataset = String(queryParams.dataset || "togethercomputer/llama-instruct").trim();
    const config = String(queryParams.config || "default").trim();
    const split = String(queryParams.split || "train").trim();
    const offset = Math.max(0, parseInt(queryParams.offset, 10) || 0);
    const length = Math.min(100, Math.max(1, parseInt(queryParams.length, 10) || 100));

    // 3. Construct Hugging Face Server URL
    const targetUrl = new URL("https://datasets-server.huggingface.co/rows");
    targetUrl.searchParams.set("dataset", dataset);
    targetUrl.searchParams.set("config", config);
    targetUrl.searchParams.set("split", split);
    targetUrl.searchParams.set("offset", String(offset));
    targetUrl.searchParams.set("length", String(length));

    console.log(`[CrazeMind] Proxying request to: ${targetUrl.toString()}`);

    // 4. Request Headers & Authentication
    const hfToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;
    const headers = {
        "Accept": "application/json",
        "User-Agent": "CrazeMind-CrazeStudio/1.0 (Proxy Service)"
    };

    if (hfToken) {
        headers["Authorization"] = `Bearer ${hfToken}`;
    }

    try {
        const response = await fetch(targetUrl.toString(), {
            method: "GET",
            headers
        });

        const rawText = await response.text();
        let payload;

        try {
            payload = JSON.parse(rawText);
        } catch {
            return res.status(502).json({
                error: "Invalid JSON response from upstream server",
                status: response.status,
                details: rawText.slice(0, 1000)
            });
        }

        // 5. Handle Hugging Face 202 (Dataset is being cached/indexed)
        if (response.status === 202) {
            return res.status(202).json({
                error: "Dataset processing in progress",
                status: 202,
                message: payload?.message || "The dataset is currently being processed by Hugging Face. Retry in a few moments.",
                estimated_time: payload?.estimated_time ?? null
            });
        }

        // 6. Handle HTTP Error Responses from Hugging Face
        if (!response.ok) {
            return res.status(response.status).json({
                error: payload?.message || "Hugging Face upstream error",
                status: response.status,
                details: payload
            });
        }

        // 7. Validate Dataset Rows Structure
        if (!payload || !Array.isArray(payload.rows)) {
            return res.status(502).json({
                error: "Malformed dataset response",
                details: "Hugging Face returned successful status but did not provide a valid 'rows' array.",
                raw: payload
            });
        }

        // 8. Return Standardized Clean Response
        return res.status(200).json({
            dataset,
            config,
            split,
            offset,
            length: payload.rows.length,
            num_rows_total: payload.num_rows_total ?? null,
            num_rows_per_page: payload.num_rows_per_page ?? payload.rows.length,
            partial: payload.partial ?? false,
            rows: payload.rows
        });

    } catch (error) {
        console.error("[CrazeMind] Proxy Fetch Exception:", error);

        return res.status(502).json({
            error: "Gateway Connection Failure",
            details: error?.message || String(error)
        });
    }
}
