define(["sprd/manager/IBasketManager", "flow", "sprd/model/Basket", "xaml!sprd/data/SprdApiDataSource",
        "js/data/LocalStorage", "js/data/Entity", "rAppid", "underscore"],
    function (IBasketManager, flow, Basket, SprdApiDataSource, LocalStorage, Entity, rAppid, _) {

        /***
         * @summary A BasketManager to interact with the Spreadshirt Basket API
         *
         * @see http://developer.spreadshirt.net/display/API/Basket+Resources
         */
        return IBasketManager.inherit('sprd.manager.ApiBasketManager', {
            defaults: {
                /***
                 * the basket model
                 * @type {sprd.model.Basket}
                 */
                basket: null,

                /***
                 * the id of the api basket which should try to be loaded.
                 * If the id isn't set the id is retrieved from the local storage or generated by the api
                 * after the basket has been created successfully. The id is written back to this property.
                 */
                apiBasketId: null,

                /***
                 * the shop used for creating a new basket
                 * @type {sprd.model.Shop}
                 */
                shop: null,

                /***
                 * the origin id used for basked items
                 * @type {Number|String}
                 */
                originId: null,

                /***
                 * a flag that indicates if the basket is updating
                 */
                updating: false,

                initBasketWithNoCache: true,

                /**
                 * if set, the element which is added will be saved under this basket item
                 */
                basketItem: null,
                /**
                 * a flag to trigger opossum synchronisation
                 */
                syncToOpossum: false
            },

            events: [
            /***
             * the basketChanged event is dispatched after the basket has been modified e.g. added, removed or updated an
             * BasketItem
             */
                "on:basketChanged",
                "on:basketUpdated",
                "on:basketUpdating",
                "on:basketSaving",
                "on:basketInitialized",
                "on:couponApplied"
            ],

            inject: {
                api: SprdApiDataSource,
                localStorage: LocalStorage
            },


            ctor: function () {
                this.callBase();

                this.bind("on:basketUpdated", function () {
                    this.set("updating", false);
                }, this);

                this.bind("on:basketUpdating", function () {
                    this.set("updating", true);
                }, this);

            },

            _commitBasket: function (basket) {

                if (basket) {
                    basket = basket.clone();
                }

                // remember a clone
                this.$originalBasket = basket;
            },

            /**
             * Adds an element to the basket without saving it
             * @param element
             * @param quantity
             * @param callback
             */
            addElementToBasket: function (element, quantity, callback) {
                if (this.$.basket) {
                    var basketItem = this.$.basket.addElement(element, quantity);
                    element = basketItem.$.element;

                    var originId = this.$.originId;
                    if (originId) {
                        basketItem.set('origin', new Entity({
                            id: originId
                        }));
                    }

                    this.extendElementWithLinks(element);
                }

                callback && callback();
            },
            /**
             * Updates the given basket item
             *
             * @param {sprd.model.BasketItem} basketItem
             * @param {sprd.model.ConcreteElement} element
             * @param {Number} quantity
             * @param {Function} cb
             */
            updateBasketItem: function (basketItem, element, quantity, cb) {
                this.extendElementWithLinks(element);

                basketItem.set({
                    element: element,
                    quantity: quantity
                });

                basketItem.save(null, cb);
            },

            waitForCouponApply: function (callback) {
                function couponAppliedCallback() {
                    this.unbind('on:couponApplied', couponAppliedCallback, this);
                    callback && callback();
                }

                if (this.$applyingCoupon) {
                    this.bind('on:couponApplied', couponAppliedCallback, this);
                } else {
                    callback();
                }
            },
            applyCoupon: function (coupon, cb) {
                if (!this.$applyingCoupon) {
                    this.$applyingCoupon = true;
                    coupon.set('currency', this.get('basket.currency'));
                    var self = this;
                    coupon.validate(function (err) {
                        if (coupon.isValid()) {
                            self.reloadBasket();
                        }
                        self.trigger('on:couponApplied', coupon, self);
                        self.$applyingCoupon = false;
                        cb && cb(err, coupon);
                    })
                }
            },

            removeCoupon: function (coupon, cb) {
                var self = this;
                coupon.remove(null, function () {
                    self.reloadBasket();
                    cb && cb();
                });
            },

            _triggerBasketSaving: function () {
                this.trigger("on:basketSaving", this.$.basket, this);
            },

            _triggerBasketChanged: function () {
                this.trigger("on:basketChanged", this.$.basket, this);
            },

            _triggerBasketUpdated: function () {
                this.trigger("on:basketUpdated", this.$.basket, this);
            },

            _triggerBasketUpdating: function () {
                this.trigger("on:basketUpdating", this.$.basket, this);
            },

            _initBasket: function (callback) {

                var api = this.$.api,
                    localStorage = this.$.localStorage,
                    basketId = this.$.apiBasketId,
                    basket,
                    self = this;

                basketId = basketId || localStorage.getItem("basketId");

                basket = api.createEntity(Basket, basketId);

                this.set({
                    basket: basket,
                    apiBasketId: basketId
                });

                var basketSaveCallback = function (err) {
                    if (!err) {
                        self.set("apiBasketId", basketId);

                        // try to save basket id to local storage
                        // this will fail in private browsing mode, but we can ignore this


                        try {
                            self.$.localStorage.setItem("basketId", basket.$.id);
                        } catch (e) {
                            // ignore this
                        }

                        try {
                            self._triggerBasketChanged();
                            self.fetchBasketDiscounts(callback);
                        } catch (e) {
                            callback && callback(e);
                            return;
                        }

                        callback && callback();

                    } else {
                        console.warn(err);
                        callback && callback(err);
                    }

                };

                if (basket.isNew()) {

                    basket.set({
                        shop: this.$.shop,
                        currency: this.get("shop.currency")
                    });

                    basket.save(null, basketSaveCallback);
                } else {
                    flow()
                        .seq(function (cb) {
                            basket.fetch({
                                noCache: self.$.initBasketWithNoCache,
                                fetchSubModels: ["currency"]
                            }, cb);
                        })
                        .seq(function (cb) {
                            self.fetchBasketDiscounts(cb);
                        })
                        .seq(function (cb) {
                            self.fetchBasketCoupons(function () {
                                cb();
                            });
                        })
                        .exec(function (err) {
                            if (err) {
                                // something went wrong
                                basket.set('id', undefined);
                                basket.save(null, basketSaveCallback);
                                console.warn(err);
                            } else {

                                self.set("shop", basket.$.shop);

                                flow()
                                    .parEach(basket.$.basketItems.toArray(), function (item, cb) {
                                        flow()
                                            .seq(function (cb) {
                                                item.$.element.init(cb);
                                            })
                                            .seq(function (cb) {
                                                item.$.element.getProduct().fetch({
                                                    fetchSubModels: ["productType"]
                                                }, cb);
                                            })
                                            .exec(function (err) {
                                                if (err) {
                                                    basket.$.basketItems.remove(item);
                                                }

                                                cb();
                                            });
                                    })
                                    .exec(function (err) {
                                        if (!err) {
                                            self.$originalBasket = basket.clone();
                                            self.trigger("on:basketInitialized", basket, self);
                                        }

                                        callback && callback(err, basket);
                                    });
                            }
                        });
                }
            },

            fetchBasketDiscounts: function (cb) {
                var basket = this.$.basket;
                if (basket.$.discounts && basket.$.discounts.size()) {
                    var discount = basket.$.discounts.at(0);
                    if (discount && discount.$.discountScale) {
                        discount.$.discountScale.fetch(null, cb);
                    } else {
                        cb();
                    }
                } else {
                    cb();
                }
            },

            fetchBasketCoupons: function (cb) {
                var basket = this.$.basket;
                if (basket && basket.schema.coupons) {
                    var coupons = basket.getCollection("coupons");
                    coupons.invalidatePageCache();
                    coupons.fetch(cb);
                } else {
                    cb && cb();
                }
            },

            /**
             *
             * @param {sprd.model.BasketItem} basketItem
             */
            saveBasketItem: function (basketItem) {
                var self = this;
                this.$itemSaveTimeout && clearTimeout(this.$itemSaveTimeout);


                this.$itemSaveTimeout = setTimeout(function () {
                    basketItem.save(null, function () {
                        self.$.basket.fetch({noCache: true});
                    });
                    self._triggerBasketChanged();
                }, 300);
            },

            /**
             *
             * @param {sprd.model.BasketItem} basketItem
             */
            removeBasketItem: function (basketItem) {
                this.$.basket.$.basketItems.remove(basketItem);
                this.saveBasketDebounced();
            },

            saveBasketDebounced: function (cb) {

                var self = this;

                this._triggerBasketUpdating();
                this._debounceFunctionCall(function () {
                    cb && cb();
                    this.saveBasket(function (err) {
                        if (err) {
                            // couldn't save basket, restore clone
                            if (self.$originalBasket) {
                                self.$originalBasket.sync();
                            }
                        } else {
                            // success create a new copy of it
                            self.$originalBasket = self.$.basket.clone();
                        }
                    });

                }, "saveBasketCall", 700, this, [], "DELAY");
            },

            getBasketDiscountCount: function(basket) {

                if (basket.$.discounts) {
                    return _.filter(basket.$.discounts.$items, function(d) {
                        return d.$.type != "scale";
                    }).length;
                }

                return null;
            },

            saveBasket: function (callback) {
                if (!this.$savingBasket) {
                    this._triggerBasketUpdating();
                    this._triggerBasketSaving();
                    this.$savingBasket = true;
                    this.$callSaveBasketAgain = false;
                    this.$saveCallbacks = this.$saveCallbacks || [];
                    if (callback) {
                        this.$saveCallbacks.push(callback);
                    }
                    var self = this,
                        basket = this.$.basket,
                        coupon;

                    function callCallbacks(err, basket) {
                        var cb;
                        while (self.$saveCallbacks && self.$saveCallbacks.length) {
                            cb = self.$saveCallbacks.shift();
                            cb && cb(err, basket);
                        }
                    }

                    var discountsBeforeRefresh = this.getBasketDiscountCount(basket);

                    flow()
                        .seq(function (cb) {
                            basket.save(null, cb);
                        })
                        .seq(function (cb) {
                            if (self.$.syncToOpossum) {
                                // TODO: remove this shit after new checkout is live everywhere
                                rAppid.ajax("/syncBasket", {
                                    "method": "GET",
                                    "queryParameter": {
                                        basketId: basket.$.id
                                    }
                                }, function () {
                                    cb();
                                });
                            } else {
                                cb();
                            }
                        })
                        .seq(function () {
                            self._triggerBasketChanged();
                        })
                        .seq(function (cb) {
                            self.fetchBasketDiscounts(cb);
                        })
                        .seq(function(cb) {
                            if (discountsBeforeRefresh != null && self.getBasketDiscountCount(basket) != discountsBeforeRefresh) {
                                self.fetchBasketCoupons(cb);
                            } else {
                                cb();
                            }
                        })
                        .exec(function (err) {
                            if (self.$basketChanged) {
                                self.$basketChanged = false;
                                self.$savingBasket = false;
                                self.saveBasket();
                            } else {
                                callCallbacks(err, basket);
                                self.$savingBasket = false;
                                self._triggerBasketUpdated();
                            }
                        });
                } else {
                    if (callback) {
                        this.$saveCallbacks.push(callback);
                    }

                    this.$basketChanged = true;
                }
            },
            reloadBasket: function (callback) {
                this._triggerBasketUpdating();
                var self = this,
                    basket = this.$.basket;
                flow()
                    .seq(function (cb) {
                        basket.fetch({noCache: true}, cb);
                    })
                    .seq(function (cb) {
                        self.fetchBasketCoupons(cb);
                    })
                    .exec(function (err, basket) {
                        self._triggerBasketUpdated();
                        callback && callback(err, basket)
                    })
            }
        });

    });