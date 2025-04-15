const { Quagga } = require("quagga");

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("logaligroup.mapebapi.controller.Item", {
        onInit: function () {
            this.getView().setModel(this.getOwnerComponent().getModel());
        },
        onBack: function () {
            this.getOwnerComponent().getRouter().navTo("main");
        },
        onScan: function () {
            var oView = this.getView();
            var oModel = oView.getModel();

            //verificar si Quagga esta disponible
            if (!window.Quagga) {
                MessageToast.show("Error: QuaggaJS no está cargado ");
                return;
            }
            //Mostrar el contenedor de video
            var oVideoContainer = oView.byId("videoContainer");
            oVideoContainer.setVisible(true);

            //Ajustar dimensiones del video segun el tamaño de pantalla
            var iWidth = window.innerWidth > 1024 ? 640 : window.innerWidth > 600 ? 480 : 320;
            var iHeigth = window.innerWidth > 1024 ? 480 : window.innerWidth > 600 ? 360 : 240;

            //Inicializar QuaggaJS
            Quagga.init({
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: document.querySelector("#videoContainer"),
                    constraints: {
                        width: iWidth,
                        height: iHeigth,
                        facingMode: "environment"
                    }
                },
                decoder: {
                    readers: [
                        "code_128_reader",
                        "ean_reader",
                        "ean_8_reader",
                        "upc_reader"
                    ]
                }
            }, function (err) {
                if (err) {
                    MessageToast.show("Error al iniciar Escaner:" + err.message);
                    oVideoContainer.setVisible(false);
                    return;
                }
                Quagga.start();
                MessageToast.show("Escaneando ... Apunta la cámara al codigo de barras");
            });

            //manejar resultado del escaneo
            Quagga.onDetected(function (result) {
                var sCode = result.codeResult.code;
                MessageToast.show("codigo escaneado: " + sCode);
                oModel.setProperty("/currentItem/material", sCode);
                Quagga.stop();
                oVideoContainer.setVisible(false);
            }.bind(this));

            //Manejoar errores  durante  el escaneo 
            Quagga.onProcessed(function (result) {
                if (result && result.error) {
                    console.log("error en escaneo", result.error);
                }
            });

        },
        onMaterialSubmit: function (oEvent) {
            var sMaterial = oEvent.getSource().getValue();
            if (sMaterial) {
                MessageToast.show("Material Ingresado: " + sMaterial);
            }
        },

        onAddItem: function () {
            var oModel = this.getView().getModel();
            var oCurrentItem = oModel.getProperty("/currentItem");
            var sMoveType = oModel.getProperty("/header/move_type");

            if (!oCurrentItem.material || !oCurrentItem.plant || !oCurrentItem.stge_loc || !oCurrentItem.entry_qnt || !oCurrentItem.entry_uom) {
                MessageToast.show("Complete los campos obligatorios");
                return;
            }
            if ((sMoveType === "201" || sMoveType === "551") && !oCurrentItem.costcenter) {
                MessageToast.show("Ingrese el centro de costo ");
                return;

            }
            if (sMoveType === "551" && !oCurrentItem.move_reas) {
                MessageToast.show("Seleccione un motivo");
                return;
            }
            var aItems = oModel.getProperty("/items") || [];
            aItems.push({
                material: oCurrentItem.material,
                plant: oCurrentItem.plant,
                stge_loc: oCurrentItem.stage_loc,
                batch: oCurrentItem.batch,
                move_type: sMoveType,
                entry_qnt: parseFloat(oCurrentItem.entry_qnt),
                entry_uom: oCurrentItem.entry_uom,
                constcenter: oCurrentItem.costcenter,
                move_reas: oCurrentItem.move_reas
            });
            oModel.setProperty("/items", aItems);
            oModel.setProperty("/currentItem" ,{
                material: "",
                plant: "",
                stage_loc: "",
                entry_qnt: "",
                entry_uom: "",
                costcenter: "",
                move_reas: ""
            });
            MessageToast.show("Posición agregada");
        },
        onSubmitAll: function () {
            var oModel = this.getView().getModel();
            var oHeader = oModel.getProperty("/header");
            var aItems = oModel.getProperty("/items");

            var oPayload = {
                GOODS_HEADER: {
                    PSTNG_DATE: oHeader.pstng_date,
                    DOC_DATE: oHeader.doc_date,
                    REF_DOC_NO: oHeader.ref_doc_no,
                    HEADER_TXT: oHeader.header_txt,
                    VER_GR_GI_SLIP: "3",
                    VER_GR_GI_sLIPX: "x"

                },
                GOODSMVT_CODE: {
                    GM_CODE: "03"

                },
                GOODSMTV_ITEM: aItems.map(function (item) {
                    return {
                        MATERIAL: item.material,
                        PLANT: item.plant,
                        STAGE_LOC: item.stge_loc,
                        BATCH: item.batch,
                        MOVE_TYPE: item.move_type,
                        ENTRY_QNT: item.entry_qnt,
                        ENTRY_UOM: item.entry_uom,
                        COSTCENTER: item.costcenter,
                        MOVE_REAS: item.move_reas
                    };
                })

            };
            this._submitToBackend(oPayload).then(function (oResponse) {
                MessageToast.show("Movimiento registrado" + oResponse.document);
                oModel.setProperty("/header", {
                    reference_type: "",
                    reserv_no: "",
                    res_item: "",
                    orderid: "",
                    move_type: "",
                    pstng_date: new Date().toISOString().split("T")[0],
                    doc_date: new Date().toISOString().split("T")[0],
                    ref_doc_no: "",
                    header_txt: ""
                });
                oModel.setProperty("/items", []);
                oModel.setProperty("/currentItem", {});
                this.getOwnerComponent().getRouter().navTo("main");

            }.bind(this)).catch(function (oError) {
                MessageToast.show("Error:" + oError.message);
            });
        },
        _submitToBackend: function (oPayload) {
            return new Promise(function (resolve) {
                console.log("payload enviado", oPayload);
                setTimeout(function () {
                    resolve({ document: "4900001234" });
                }, 1000);
            });
        }
    });
});