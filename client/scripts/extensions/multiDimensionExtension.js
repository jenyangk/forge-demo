// Add buttons to Toolbar

function multiDimensionExtension(viewer, options) {
    Autodesk.Viewing.Extension.call(this, viewer, options);
    console.log("%c MultiDimensionExtension Constructor.", CONSOLE_COLOR);
}

multiDimensionExtension.prototype = Object.create(
    Autodesk.Viewing.Extension.prototype
);
multiDimensionExtension.prototype.constructor = multiDimensionExtension;

multiDimensionExtension.prototype.load = function () {
    console.log("%c MultiDimensionExtension is loaded", CONSOLE_COLOR);

    this.viewer.fitToView();
    return true;
};

multiDimensionExtension.prototype.onToolbarCreated = function(toolbar) {
    var viewer = this.viewer;

    // 2D Button
    

}

multiDimensionExtension.prototype.unload = function () {
    console.log("%c MultiDimensionExtension is unloaded", CONSOLE_COLOR);
    return true;
};

Autodesk.Viewing.theExtensionManager.registerExtension(
    "multiDimensionExtension",
    multiDimensionExtension
);
