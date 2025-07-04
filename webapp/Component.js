sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/Device",
  "logaligroup/mapeobapi/model/models",
  "logaligroup/mapeobapi/localService/mockServer",
  "sap/m/library",
  "sap/f/library"
], function (UIComponent, Device, models, MockServer, mLibrary, fLibrary) {
  "use strict";

  return UIComponent.extend("logaligroup.mapeobapi.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      // Precargar librerías
      sap.ui.getCore().loadLibrary("sap.m", true).then(() => {
        console.log("sap.m cargado correctamente");
      }).catch(err => {
        console.error("Error al cargar sap.m:", err);
      });
      sap.ui.getCore().loadLibrary("sap.f", true).then(() => {
        console.log("sap.f cargado correctamente");
      }).catch(err => {
        console.error("Error al cargar sap.f:", err);
      });

      // Iniciar el MockServer
      try {
        MockServer.init();
        console.log("MockServer inicializado correctamente");
      } catch (e) {
        console.error("Error al inicializar MockServer:", e);
      }

      // Llamar al init del padre
      UIComponent.prototype.init.apply(this, arguments);

      // Crear los modelos
      this.setModel(models.createDeviceModel(), "device");
      this.setModel(models.createMainModel(), "mainModel");

      // Inicializar el router
      this.getRouter().initialize();
    },

    getContentDensityClass: function () {
      return Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact";
    }
  });
});