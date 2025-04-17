sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/model/JSONModel"
], function (UIComponent, Device, JSONModel) {
    "use strict";

    return UIComponent.extend("logaligroup.mapeobapi.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            // Llama a la inicialización del componente padre
            UIComponent.prototype.init.apply(this, arguments);

            // Prueba simple con JSONModel
            var oModel = new JSONModel({ test: "Hello" });
            this.setModel(oModel, "testModel");

            // Inicializa el router
            this.getRouter().initialize();
        }
    });
});