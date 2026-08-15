export async function wikipediaSearch(query) {

    const url =
        "https://en.wikipedia.org/api/rest_v1/page/summary/" +
        encodeURIComponent(
            query
                .trim()
                .replace(/\s+/g, "_")
        );


    try {

        const response =
            await fetch(url);


        if (!response.ok) {
            return null;
        }


        const data =
            await response.json();


        return {

            title:
                data.title || query,

            text:
                data.extract || "",

            url:
                data.content_urls
                    ?.desktop
                    ?.page || ""
        };

    } catch (error) {

        console.error(
            "Wikipedia error:",
            error
        );

        return null;
    }
}


export async function duckSearch(query) {

    const url =
        "https://api.duckduckgo.com/?q=" +
        encodeURIComponent(query) +
        "&format=json&no_html=1";


    try {

        const response =
            await fetch(url);


        if (!response.ok) {
            return null;
        }


        const data =
            await response.json();


        let text =
            data.AbstractText || "";


        let title =
            data.Heading ||
            "DuckDuckGo";


        /*
            DuckDuckGo sometimes returns
            useful related topics instead
            of an abstract.
        */

        if (
            !text &&
            Array.isArray(
                data.RelatedTopics
            )
        ) {

            for (
                const topic
                of data.RelatedTopics
            ) {

                if (topic.Text) {

                    text =
                        topic.Text;

                    break;
                }
            }
        }


        return {

            title,

            text,

            url:
                data.AbstractURL || ""
        };

    } catch (error) {

        console.error(
            "DuckDuckGo error:",
            error
        );

        return null;
    }
}