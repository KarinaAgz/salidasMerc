
     sap.ui.define([
         "sap/ui/core/UIComponent",
         "sap/ui/Device",
         "logaligroup/mapeobapi/model/models"
     ], function (UIComponent, Device, models) {
         "use strict";

         return UIComponent.extend("logaligroup.mapeobapi.Component", {
             metadata: {
                 manifest: "json"
             },

             init: function () {
                 // Call the base component's init function
                 UIComponent.prototype.init.apply(this, arguments);

                 // Initialize the router
                 this.getRouter().initialize();

                 // Set the device model
                 this.setModel(models.createDeviceModel(), "device");

                 // Log for debugging
                 console.log("mockModel en Component.init:", this.getModel("mockModel"));
             }
         });
     });
   