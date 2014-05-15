define([
    "sprd/data/SprdModel",
    'js/data/Collection',
    'sprd/model/Basket',
    'sprd/model/Currency',
    'sprd/model/Address',
    'sprd/model/Design',
    'sprd/model/ProductType',
    'sprd/model/ProductTypeDepartment',
    'sprd/model/ArticleCategory',
    'sprd/model/DesignCategory',
    'sprd/model/Article', 'sprd/model/Country', 'sprd/model/PrintType', 'sprd/model/FontFamily', "sprd/model/Product", "sprd/model/DiscountScale", 'sprd/model/Application'],
    function (SprdModel, Collection, Basket, Currency, Address, Design, ProductType, ProductTypeDepartment, ArticleCategory, DesignCategory, Article, Country, PrintType, FontFamily, Product, DiscountScale, Application) {

        return SprdModel.inherit("sprd.model.AbstractShop", {
            schema: {


                country: Country,
//            language: SprdModel,
                currency: Currency,
//            address: SprdModel,
                address: Address,
                productTypes: Collection.of(ProductType),
                printTypes: Collection.of(PrintType),
                fontFamilies: Collection.of(FontFamily),
                productTypeDepartments: Collection.of(ProductTypeDepartment),
//            shippingTypes: Collection,
            designCategories: Collection.of(DesignCategory),
                designs: Collection.of(Design),
                articleCategories: Collection.of(ArticleCategory),
                articles: Collection.of(Article),
                discountSupported: Boolean,
                discountScale: DiscountScale,
                products: Collection.of(Product),
                currencies: Collection.of(Currency),
//            languages: Collection,
                countries: Collection.of(Country),
                baskets: Collection.of(Basket),
                applications: Collection.of(Application),
                name: String,
                description: String,
                user: "sprd/model/User"

            }
        });
    });

