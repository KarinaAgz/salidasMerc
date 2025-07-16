
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("logaligroup.mapeobapi.controller.BaseController", {
        /***
        
         * @description Muestra un mensaje emergente (MessageToast) con una duración y posición
         *              predefinidas.
         * @param {string} sMessage - Mensaje a mostrar.
         */
        showMessage: function (sMessage) {
            MessageToast.show(sMessage, {
                duration: 3000,
                width: "15em",
                my: "center center",
                at: "center center"
            });
        }
    });
});