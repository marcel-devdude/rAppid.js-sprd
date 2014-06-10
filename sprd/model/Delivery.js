define(["sprd/data/SprdModel", "js/data/Entity", "sprd/entity/Address", "sprd/model/ShippingType", "underscore"], function(SprdModel, Entity, Address, ShippingType, _) {

    var Billing = Entity.inherit("sprd.model.Order.Billing", {
        defaults: {
            address: Address
        },

        schema: {
            address: Address
        }

    });


    var Shipping = Entity.inherit("sprd.model.Order.Shipping", {
        defaults: {
            address: Address,
            type: null
        },

        schema: {
            address: Address,
            type: ShippingType
        }
    });


    return SprdModel.inherit("checkout.model.Delivery", {

        defaults: {
            billing: Billing,
            shipping: Shipping,

            email: null,
            presentMessage: null,
            invoiceToShippingAddress: true
        },


        $isDependentObject: true,

        schema: {
            shipping: Shipping,
            billing: Billing,

            email: String,
            presentMessage: String
        },

        invoiceAddress: function () {
            return this.$.invoiceToShippingAddress ? this.get("shipping.address") : this.get("billing.address");
        }.onChange("invoiceToShippingAddress")

    });

});