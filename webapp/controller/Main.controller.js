sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], (Controller) => {
    "use strict";

    return Controller.extend("logaligroup.mapeobapi.controller.Main", {
        onInit() {
            this.getView().setModel(this.getOwnerComponent().getModel());
        },

        onselectionchange:function(oEvent){
            var sReferenceType=oEvent.getSource().getSelectedKey();
            this.getView().getModel().setProperty("/header/reference_type", sReferenceType);

            //Limpiar campos condicionales
            this.getView().getModel().setProperty("/header/reserv_no","");
            this.getView().getModel().setProperty("header/res_item","");
            this.getView().getModel().setProperty("/header/orderid","");
            this.getView().getModel().setProperty("/header/move_type","");
        },

        onNext:function(){
            var oModel=this.getView().getModel();
            var oHeader=oModel.getProperty("/header");

            //validaciones

            if(!oHeader.sReference_Type){
                MessageToast.show("Seleccione un tipo de referencia");
                return;
            }
            if(oHeader.reference_type ==="reserva"){
                if(!oHeader.reserv_no){
                    MessageToast.show("complete el numero de reserva");
                    return;
                }
            }
            if(oHeader.reference_type=== "orden" && !oHeader.orderid){
                MessageToast.show("complete el numero de orden");
                return;
            
            }
            //NAvegar a posiciones
            this.getOwnerComponent().getRouter().navTo("item");

        }
    
    });
});