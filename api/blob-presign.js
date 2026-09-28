import {
    issueSignedToken,
    presignUrl
} from "@vercel/blob";

const WORKSHOP_DOMAINS = new Set([
    "ceh",
    "vapt",
    "soc",
    "forensics"
]);

const HACKATHON_DOMAINS = new Set([
    "ceh_hackathon",
    "vapt_hackathon",
    "soc_hackathon",
    "forensics_hackathon"
]);

function json(res, status, payload) {
    res.status(status);
    res.setHeader(
        "Content-Type",
        "application/json; charset=utf-8"
    );
    res.end(JSON.stringify(payload));
}

function safeFilename(value) {

    const original =
        String(value || "")
            .trim();

    const base =
        original
            .split(/[\\/]/)
            .pop();

    if (
        !base ||
        !base.toLowerCase().endsWith(".zip")
    ) {
        return null;
    }

    const cleaned =
        base
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .replace(/_+/g, "_");

    if (
        !cleaned ||
        cleaned === ".zip" ||
        !cleaned.toLowerCase().endsWith(".zip")
    ) {
        return null;
    }

    return cleaned;
}

function getOrigin(req) {

    const forwardedProto =
        String(
            req.headers["x-forwarded-proto"] ||
            "https"
        )
            .split(",")[0]
            .trim();

    const host =
        String(
            req.headers["x-forwarded-host"] ||
            req.headers.host ||
            ""
        )
            .split(",")[0]
            .trim();

    if (!host) {
        return null;
    }

    return `${forwardedProto}://${host}`;
}

export default async function handler(req, res) {

    if (req.method !== "POST") {

        res.setHeader(
            "Allow",
            "POST"
        );

        return json(
            res,
            405,
            {
                detail:
                    "Method not allowed."
            }
        );

    }

    try {

        /*
         * The admin cookie is HttpOnly. JavaScript cannot read it,
         * but the browser sends it to this endpoint. We forward
         * the cookie to the existing FastAPI auth-check endpoint.
         */
        const cookie =
            req.headers.cookie || "";

        if (!cookie) {

            return json(
                res,
                401,
                {
                    detail:
                        "Administrator authentication required."
                }
            );

        }

        const origin =
            getOrigin(req);

        if (!origin) {

            return json(
                res,
                500,
                {
                    detail:
                        "Unable to determine application origin."
                }
            );

        }

        const authResponse =
            await fetch(
                `${origin}/api/admin/auth-check`,
                {
                    method: "GET",
                    headers: {
                        Cookie: cookie
                    }
                }
            );

        if (!authResponse.ok) {

            return json(
                res,
                401,
                {
                    detail:
                        "Administrator authentication required."
                }
            );

        }

        const body =
            typeof req.body === "string"
                ? JSON.parse(req.body || "{}")
                : (req.body || {});

        const eventType =
            String(
                body.event_type || ""
            )
                .trim()
                .toLowerCase();

        const item =
            String(
                body.item || ""
            )
                .trim()
                .toLowerCase();

        const filename =
            safeFilename(
                body.filename
            );

        const contentType =
            String(
                body.content_type ||
                "application/zip"
            )
                .trim();

        const size =
            Number(body.size || 0);

        if (
            eventType !== "workshop" &&
            eventType !== "hackathon"
        ) {

            return json(
                res,
                400,
                {
                    detail:
                        "Invalid event type."
                }
            );

        }

        const validDomains =
            eventType === "workshop"
                ? WORKSHOP_DOMAINS
                : HACKATHON_DOMAINS;

        if (!validDomains.has(item)) {

            return json(
                res,
                400,
                {
                    detail:
                        "Invalid toolkit domain."
                }
            );

        }

        if (!filename) {

            return json(
                res,
                400,
                {
                    detail:
                        "Only ZIP toolkit files are allowed."
                }
            );

        }

        if (
            contentType !== "application/zip" &&
            contentType !==
                "application/x-zip-compressed" &&
            contentType !==
                "application/octet-stream"
        ) {

            return json(
                res,
                400,
                {
                    detail:
                        "Invalid toolkit content type."
                }
            );

        }

        if (
            !Number.isFinite(size) ||
            size <= 0
        ) {

            return json(
                res,
                400,
                {
                    detail:
                        "Invalid toolkit file size."
                }
            );

        }

        /*
         * A unique pathname means re-uploading a file with the
         * same filename does not overwrite the previous Blob
         * object. Neon metadata is updated to the newest object.
         */
        const pathname =
            [
                "war-room",
                "toolkits",
                eventType,
                item,
                `${Date.now()}-${cryptoRandomId()}-${filename}`
            ].join("/");

        const validUntil =
            Date.now() +
            (15 * 60 * 1000);

        const signedToken =
            await issueSignedToken({
                pathname,
                operations: ["put"],
                validUntil
            });

        const result =
            await presignUrl(
                signedToken,
                {
                    pathname,
                    operation: "put",
                    validUntil
                }
            );

        const presignedUrl =
            result.presignedUrl;

        /*
         * WAR ROOM currently expects a durable public download URL
         * in toolkit_files. The Blob store used by this project
         * should therefore be a PUBLIC Blob store.
         *
         * The query string is only the temporary PUT signature.
         * Removing it gives the permanent public Blob object URL.
         */
        const blobUrl =
            presignedUrl.split("?")[0];

        const downloadUrl =
            `${blobUrl}?download=1`;

        return json(
            res,
            200,
            {
                success: true,
                filename,
                pathname,
                presigned_url:
                    presignedUrl,
                blob_url:
                    blobUrl,
                download_url:
                    downloadUrl,
                content_type:
                    contentType,
                size
            }
        );

    } catch (error) {

        console.error(
            "BLOB PRESIGN ERROR:",
            error
        );

        return json(
            res,
            500,
            {
                detail:
                    error?.message ||
                    "Unable to prepare Blob upload."
            }
        );

    }

}

function cryptoRandomId() {

    return Math.random()
        .toString(36)
        .slice(2, 10);

}
