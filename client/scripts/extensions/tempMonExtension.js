(() => {
    // namespace closure

    // consts
    const CONSOLE_COLOR = "background: #222; color: #bada55";

    // reference: https://forge.autodesk.com/en/docs/viewer/v7/developers_guide/viewer_basics/extensions/
    const SPRITE_STYLES = {
        temperature: {
            url: "images/temp.svg",
            color: 0xffffff,
        },
    };

    // Constructor
    function TempMonExtension(viewer, options) {
        Autodesk.Viewing.Extension.call(this, viewer, options);
        console.log("%c TempMonExtension Constructor.", CONSOLE_COLOR);
    }

    // Inheritance
    TempMonExtension.prototype = Object.create(
        Autodesk.Viewing.Extension.prototype
    );
    TempMonExtension.prototype.constructor = TempMonExtension;

    // Extension Overrides

    // https://forge.autodesk.com/en/docs/viewer/v7/reference/Viewing/Extension/#load
    TempMonExtension.prototype.load = function () {
        console.log("%c TempMonExtension is loaded.", CONSOLE_COLOR);
        this.viewer.addEventListener(
            Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
            onModelLoaded,
            { once: true }
        );
        return true;
    };

    // https://forge.autodesk.com/en/docs/viewer/v7/reference/Viewing/Extension/#unload
    TempMonExtension.prototype.unload = function () {
        console.log("%c TempMonExtension is now unloaded.", CONSOLE_COLOR);
        this.viewer.removeEventListener(
            Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
            handleSelectionChange
        );
        return true;
    };

    async function onModelLoaded(data) {
        const viewer = data.target;

        // Load Data Viz Lib: https://forge.autodesk.com/en/docs/dataviz/v1/developers_guide/introduction/overview/
        await viewer.loadExtension("Autodesk.DataVisualization");

        const dataVizExt = viewer.getExtension("Autodesk.DataVisualization");
        const DATAVIZEXTN = Autodesk.DataVisualization.Core;
        const structureInfo = new DATAVIZEXTN.ModelStructureInfo(data.model);

        // Create model-to-style map from style definitions.
        let styleMap = {};

        // Create model-to-style map from style definitions.
        Object.entries(SPRITE_STYLES).forEach(([type, styleDef]) => {
            styleMap[type] = new DATAVIZEXTN.ViewableStyle(
                DATAVIZEXTN.ViewableType.SPRITE,
                new THREE.Color(styleDef.color),
                styleDef.url
            );
        });

        const viewableData = new DATAVIZEXTN.ViewableData();
        viewableData.spriteSize = 16;

        let devices = [];
        let startId = 1;
        let levelRoomsMap = await structureInfo.getLevelRoomsMap();
        let rooms = levelRoomsMap.getRoomsOnLevel("Level 1");
        console.log(rooms);
        for (let room of rooms) {
            let center = new THREE.Vector3();
            room.bounds.getCenter(center);
            const device = {
                id: room.name + " device", // An ID to identify this device
                position: { x: center.x, y: center.y, z: center.z }, // World coordinates of this device
                sensorTypes: ["temperature"], // The types/properties this device exposes
            };
            room.addDevice(device);
            devices.push(device);
        }

        devices.forEach((device) => {
            let style = styleMap["temperature"];
            const viewable = new DATAVIZEXTN.SpriteViewable(
                device.position,
                style,
                startId
            );
            viewableData.addViewable(viewable);
            startId++;
        });
        await viewableData.finish();
        dataVizExt.addViewables(viewableData);

        // Load Level Data
        let viewerDocument = data.model.getDocumentNode().getDocument();
        const aecModelData = await viewerDocument.downloadAecModelData();
        let levelsExt;
        if (aecModelData) {
            levelsExt = await viewer.loadExtension(
                "Autodesk.AEC.LevelsExtension"
            );
        }

        // get FloorInfo
        const floorData = levelsExt.floorSelector.floorData;
        const floor = floorData[2];
        levelsExt.floorSelector.selectFloor(floor.index, true);

        const heatmapData = await structureInfo.generateSurfaceShadingData(
            devices
        );
        await dataVizExt.setupSurfaceShading(data.model, heatmapData, {
            type: "PlanarHeatmap",
            placementPosition: 0.0,
            slicingEnabled: true,
        });
        dataVizExt.registerSurfaceShadingColors("co2", [0x00ff00, 0xff0000]);
        dataVizExt.registerSurfaceShadingColors(
            "temperature",
            [0xff0000, 0x0000ff]
        );

        /**
         * Interface for application to decide what the current value for the heatmap is.
         *
         * @param {string} device device id
         * @param {string} sensorType sensor type
         */
        function getSensorValue(device, sensorType) {
            // just try to avoid line warning
            device, sensorType;
            let value = Math.random();
            return value;
        }

        dataVizExt.renderSurfaceShading(
            floor.name,
            "temperature",
            getSensorValue
        );

        setInterval(() => {
            dataVizExt.updateSurfaceShading(getSensorValue);
        }, 200)
    }

    // add sprites to model search by property value
    async function attachSpriteAndHeatmapBySearch(
        propertyName,
        propertyValue,
        viewer,
        style,
        size
    ) {
        return new Promise(async (res) => {
            // Get DataViz
            const dataVizExt = await viewer.getExtension(
                "Autodesk.DataVisualization"
            );
            if (!dataVizExt) {
                return;
            }

            // create a data container
            const viewableData =
                new Autodesk.DataVisualization.Core.ViewableData();
            viewableData.spriteSize = size;

            // add sprites per dbid returned from search
            let dbids = [];
            for (const value of propertyValue) {
                const dbid = await findByPropertyValue(
                    viewer,
                    propertyName,
                    value
                );
                dbids = dbids.concat(await dbid);
            }

            // exit if search finds nothing
            if (!dbids.length) {
                return;
            }

            // convert dbid to x,y,z coords
            let sensorCount = 0;
            const sensors = dbids.map((dbid) => {
                return {
                    position: dbidToWorldCoordinates(viewer, dbid),
                    dbid,
                    sensorTypes: ["temperature", "humidity"],
                    id: `Sensor ${sensorCount++}`,
                };
            });

            // for each valid x,y,z place sensor sprite
            sensors.forEach((sensor) => {
                if (sensor.position) {
                    const viewable =
                        new Autodesk.DataVisualization.Core.SpriteViewable(
                            sensor.position,
                            style,
                            sensor.dbid
                        );
                    viewableData.addViewable(viewable);
                }
            });

            // render sprites
            await viewableData.finish();
            dataVizExt.addViewables(viewableData);

            // --- heatmap surface shading ---
            const {
                SurfaceShadingData,
                SurfaceShadingPoint,
                SurfaceShadingNode,
            } = Autodesk.DataVisualization.Core;
            const heatmapData = new SurfaceShadingData();
            sensors.forEach(({ dbid }) => {
                const sensorDbid = dbid;
                const shadingNode = new SurfaceShadingNode(
                    "Electrical Box",
                    sensorDbid
                );
                const shadingPoint = new SurfaceShadingPoint(
                    "Electrical Box",
                    undefined,
                    ["Temperature"]
                );

                shadingPoint.positionFromDBId(viewer.model, sensorDbid);
                shadingNode.addPoint(shadingPoint);

                heatmapData.addChild(shadingNode);
                heatmapData.initialize(viewer.model);
            });

            await dataVizExt.setupSurfaceShading(viewer.model, heatmapData);

            // set color blue to red
            dataVizExt.registerSurfaceShadingColors(
                "Temperature",
                [0x0000ff, 0xff0000]
            );

            function getSensorValue(surfaceShadingPoint, sensorType) {
                return Math.random();
            }

            dataVizExt.renderSurfaceShading(
                "Electrical Box",
                "Temperature",
                getSensorValue
            );

            setInterval(() => {
                dataVizExt.updateSurfaceShading(getSensorValue);
            }, 200);

            // resolve JS Promise
            res();
        });
    }

    // find dbids using a refined search
    async function findByPropertyValue(viewer, propertyName, propertyValue) {
        return await viewer.model.getPropertyDb()
            .executeUserFunction(`function userFunction (pdb) {
            let dbIds = [];
            let searchAttrId = 0;
            pdb.enumAttributes( function(i, attrDef, attrRaw) {
                if (attrDef.name === '${propertyName}') {
                    searchAttrId = i;
                    return true;
                }
            });
            if (!searchAttrId) {
                return null;
            }
            pdb.enumObjects((dbId) => {
                pdb.enumObjectProperties(dbId, function(attrId, valId) {
                    if (attrId === searchAttrId) {
                        let value = pdb.getAttrValue(attrId, valId);
                        if (value === '${propertyValue}') {
                            dbIds.push(dbId);
                        }
                        return true;
                    }
                });
            });
            return dbIds;  
        }`);
    }

    // turn dbid into x,y,z in world coord system
    function dbidToWorldCoordinates(viewer, sourceDbid) {
        const instanceTree = viewer.model.getInstanceTree();
        let dst = [];
        instanceTree.getNodeBox(sourceDbid, dst);
        if (dst[0] != Infinity) {
            return {
                x: dst[0] + (dst[3] - dst[0]) / 2, // middle of object
                y: dst[1] + (dst[4] - dst[1]) / 2, // middle of object
                z: dst[2], // bottom of object
            };
        }
        return null;
    }

    Autodesk.Viewing.theExtensionManager.registerExtension(
        "TempMonExtension",
        TempMonExtension
    );
})();
