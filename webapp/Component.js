sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (UIComponent, JSONModel,MessageToast) {
    "use strict";

    return UIComponent.extend("logaligroup.mapeobapi.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            // Llamar al init de la clase base
            UIComponent.prototype.init.apply(this, arguments);

            // Sobrescribir la configuración de MessageToast para usar una posición válida
            MessageToast._mSettings = MessageToast._mSettings || {};
            MessageToast._mSettings.my = "center center"; // Posición válida
            MessageToast._mSettings.at = "center center"; // Posición válida
            // Inicializar el router
            this.getRouter().initialize();
            console.log("Component.js: Inicialización completada");
        }
    });
});