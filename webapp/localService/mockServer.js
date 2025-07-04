sap.ui.define([
    "sap/ui/core/util/MockServer",
    "sap/base/Log"
], function (MockServer, Log) {
    "use strict";

    return {
        init: function () {
            var oMockServer = new MockServer({
                rootUri: "/sap/opu/odata/sap/Z_GOODSMVT_SRV/"
            });

            oMockServer.simulate("localService/metadata.xml", {
                sMockdataBasePath: "localService/mockdata",
                bGenerateMissingMockData: true
            });

            oMockServer.start();
            Log.info("MockServer iniciado para Z_GOODSMVT_SRV");
        }
    };
});