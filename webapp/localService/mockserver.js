sap.ui.define([
    "sap/ui/core/util/MockServer"
], function (MockServer) {
    "use strict";
    return {
        init: function () {
            var oMockServer = new MockServer({
                rootUri: "/localService/"
            });

            var sMockDataPath = sap.ui.require.toUrl("logaligroup.mapeobapi/localService");
            oMockServer.simulate(sMockDataPath + "/metadata.xml", {
                sMockdataBaseUrl: sMockDataPath,
                bGenerateMissingMockData: false
            });

            // Personalizar para guardar datos
            oMockServer._oServer.on("PUT", function (req, res) {
                var oBody = JSON.parse(req.body);
                var sPath = req.url.split("/localService/")[1].split("?")[0];
                var aData = oBody.data || [];
                var sFile = sPath + ".json";
                sap.ui.require(["sap/ui/thirdparty/jszip", "fs"], function (JSZip, fs) {
                    fs.writeFileSync(sFile, JSON.stringify(aData, null, 2));
                });
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ d: aData }));
            });

            oMockServer.start();
        }
    };
});