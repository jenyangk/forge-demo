// Replace placeholder below by your encoded model urn
const urn = "dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6Y29tLnBjbC5ha29oLWZvcmdlLXN0YXJ0ZXIvdGVzdF9idWlsZC5ydnQ";
// const MODEL_2D_VIEWABLE_GRID = "abdacd31-f94c-e84f-9a58-4663e281d894"
// const MODEL_3D_VIEWABLE_GRID = "6bfb4886-f2ee-9ccb-8db0-c5c170220c40"

let viewerApp;
const documentId = `urn:${urn}`;

/**
 * Wait until document is ready and then initialize viewer and display given document.
 */
$(document).ready(() => {
    console.log('Document is ready');
    const options = {
        env: 'AutodeskProduction',
        getAccessToken: getToken
    };

    Autodesk.Viewing.Initializer(options, () => {
        const container = document.getElementById('viewer-container');

        const viewerOptions = {
            extensions: ["TempMonExtension"]
        }

        viewerApp = new Autodesk.Viewing.GuiViewer3D(container, viewerOptions);
        Autodesk.Viewing.Document.load(documentId, onDocumentLoadSuccess, onDocumentLoadError);
    });
});

/**
 * Obtains authentication token. The information is returned back via callback.
 * @param {callback} callback - callback to pass access token and expiration time.
 */
async function getToken(callback) {
    response = await fetch('/api/auth/viewtoken', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) {
        callback(response.statusText);
    }
    const data = await response.json();
    callback(data.access_token, data.expires_in);        
}

/**
 * Autodesk.Viewing.Document.load() success callback.
 * Proceeds with model initialization.
 * @param {Autodesk.Viewing.Document} doc - loaded document
 */
function onDocumentLoadSuccess(doc, errorsAndWarnings) {
    // Get default geometry
    const viewable = doc.getRoot().getDefaultGeometry(true);

    if (!viewable) {
        console.warn('Document contains no viewables');
        return;
    }
    // Start viewer
    viewerApp.start();

    viewerApp.loadDocumentNode(doc, viewable).then((model) => {
        onItemLoadSuccess(model);
    }).catch((err) => {
        onItemLoadError(err);
    });
}

/**
 * Autodesk.Viewing.Document.load() failure callback.
 * @param {number} errorCode 
 */
function onDocumentLoadError(errorCode, errorMsg, statusCode, statusText, errors) {
    console.error(`onDocumentLoadError: ${errorCode}`);
}

/**
 * loadDocumentNode resolve handler.
 * Invoked after the model's SVF has been initially loaded.

 * @param {Object} item 
 */
function onItemLoadSuccess(item) {
    console.debug('onItemLoadSuccess');
}

/**
 * loadDocumentNode reject handler.
 * @param {Object} error 
 */
function onItemLoadError(error) {
    console.error(`onItemLoadError: ${errorCode}`);
}
