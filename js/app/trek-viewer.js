/* global L */
YUI.add('trek-viewer', function (Y) {
    "use strict";

    var win = Y.config.win,
        HIDDEN_CHART_CLASS = 'is-chart-hidden',
        DEFAULT_CENTER = [46.37389, 2.4775],
        DEFAULT_ZOOM = 6,
        ZOOM_DETAILS = 15;

    Y.TrekViewer = Y.Base.create('trekViewer', Y.App, [], {
        views: {
            defaultMenu: {
                type: Y.TV.DefaultMenu
            },
            details: {
                type: Y.TV.DetailedMenu
            }
        },

        initializer: function () {
            var app = this;

            this.on('*:loadGPXUrl', function (e) {
                this._loadGpxUrl(e.url, function () {
                    app.navigate('#/details/' + win.encodeURIComponent(e.url));
                });
            });

            this.on('*:loadNew', function () {
                this._resetState();
                this.navigate('#/');
            });

            this.on('*:fitMap', function () {
                this.get('map').fitBounds(this.get('gpx').getBounds());
            });

            this.on('*:zoomStart', function () {
                this.get('map').setView(this.get('start'), ZOOM_DETAILS);
                /*
                    .panTo(this.get('start'))
                    .setZoom(ZOOM_DETAILS);
                 */
            });

            this.on('*:toggleChart', function () {
                var container = this.get('container');

                if ( container.hasClass(HIDDEN_CHART_CLASS) ) {
                    container.removeClass(HIDDEN_CHART_CLASS);
                    this.get('chart').render(container.one('.trek-viewer-chart'));
                } else {
                    container.addClass(HIDDEN_CHART_CLASS);
                }
                this.get('map').invalidateSize(true);
            });
        },

        _resetState: function () {
            this.get('container').addClass(HIDDEN_CHART_CLASS);
            this.get('map').removeLayer(this.get('gpx'));
            this.get('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);
            this.set('gpx', null);
            this.set('points', null);
            this.get('chart').destroy(true);
        },

        _loadGpxUrl: function (url, callback) {
            var gpxFile = 'http://www.corsproxy.com/' + url.replace(/^http:\/\//, ''),
                app = this, io,
                gpx;

            //gpxFile = 'ramasse-meillonas.gpx';
            //gpxFile = 'vic.gpx';

            this.get('viewContainer').addClass('is-loading');
            io = new Y.IO();
            io.send(gpxFile, {
                on: {
                    success: function (id, req) {
                        app._createPathLayer(req.response, callback);
                    },
                    failure: function (id, req) {
                        // TODO handle error
                        console.log(arguments);
                    },
                    end: function () {
                        app.get('viewContainer').removeClass('is-loading');
                    }
                }
            });

        },

        _createPathLayer: function (xmlGpx, callback) {
            var app = this, gpx;

            gpx = new L.GPX(xmlGpx, {
                async: true,
                marker_options: {
                    startIconUrl: 'vendor/leaflet-gpx/pin-icon-start.png',
                    shadowUrl: 'vendor/leaflet-gpx/pin-shadow.png',
                    endIconUrl: false
                }
            })
            .on('addline', function (e) {
                var points = e.line.getLatLngs();

                if ( !app.get('line') ) {
                    app.set('gpx', gpx);
                    app.set('points', points);

                    app.get('map').setView(app.get('start'), ZOOM_DETAILS);
                    app._createProfileChart();
                    callback();
                } else {
                    console.warn('This application only supports one trek per GPX file');
                }
            }).addTo(app.get('map'));
        },

        _createProfileChart: function () {
            var data = this.get('gpx').get_elevation_data(),
                chartData = [],
                app = this,
                labelValues = [0], labelValuesIncr = 5,
                chart, progressMarker;

            Y.Array.each(data, function (elt, i) {
                chartData.push({
                    distance: elt[0].toFixed(1),
                    altitude: elt[1],
                });
                if ( elt[0] > (labelValues[labelValues.length - 1] + labelValuesIncr) ) {
                    labelValues.push(labelValues[labelValues.length - 1] + labelValuesIncr);
                }
            }, this);

            chart = new Y.Chart({
                type: "line",
                axes: {
                    altitude: {
                        keys: ['altitude'],
                        title: 'Altitude',
                        type: "numeric",
                        position: "left"
                    }
                },
                categoryKey: "distance",
                categoryType: "numeric",
                horizontalGridlines: true,
                verticalGridlines: true,
                dataProvider: chartData,
                interactionType: "planar",
            });
            chart.getCategoryAxis().setAttrs({
                'mininum': 0,
                'maximum': data[data.length - 1][0].toFixed(1),
                'labelValues': labelValues
            });
            chart.on('planarEvent:mouseover', function (e) {
                var point = app.get('points')[e.index];

                if ( !progressMarker ) {
                    progressMarker = new L.Marker(point);
                    progressMarker.addTo(app.get('map'));
                } else {
                    progressMarker.setLatLng(point);
                }
                app.get('map').panTo(
                    app.get('points')[e.index], {animate: false}
                );
            });
            this.set('chart', chart);
        },

        _handleDefaultMenu: function () {
            this.showView('defaultMenu');
        },

        _handleDetailedMenu: function (req) {
            var app = this,
                callback = function () {
                    app.showView('details', {
                        gpx: app.get('gpx'),
                        start: app.get('start'),
                        end: app.get('end'),
                    });
                };

            if ( !this.get('gpx') ) {
                this._loadGpxUrl(req.params.gpx, callback);
            } else {
                callback();
            }
        },

        _getIgnLayer: function () {
            var scanWmtsUrl = "http://wxs.ign.fr/"
                + this.get('ignApiKey')
                + "/geoportail/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&"
                + "LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS&STYLE=normal&TILEMATRIXSET=PM&"
                + "TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image%2Fjpeg";
            return L.tileLayer(scanWmtsUrl, {attribution: '&copy; <a href="http://www.ign.fr/">IGN</a>'});
        },

        _getMapElement: function () {
            var map = Y.Node.create('<div class="trek-viewer-map" />');

            this.get('container').one('.trek-viewer-map-container').append(map);
            return map.getDOMNode();
        },

    }, {
        ATTRS: {
            routes: {
                value: [
                    {path: '/details/:gpx', callbacks: '_handleDetailedMenu'},
                    {path: '*', callbacks: '_handleDefaultMenu'},
                ]
            },

            transition: {
                value: true
            },

            serverRouting: {
                value: false
            },

            ignApiKey: {
                value: ''
            },

            gpx: {
                value: null
            },

            points: {
                value: null
            },

            start: {
                getter: function () {
                    var points = this.get('points');

                    if ( points === null ) {
                        return null;
                    }
                    return points[0];
                },
            },

            end: {
                getter: function () {
                    var points = this.get('points');

                    if ( points === null ) {
                        return null;
                    }
                    return points[points.length - 1];
                }
            },

            map: {
                lazyAdd: false,
                valueFn: function () {
                    return L.map(this._getMapElement(), {
                        center: DEFAULT_CENTER,
                        zoom: DEFAULT_ZOOM,
                        layers: [this._getIgnLayer()]
                    });
                }
            },

            chart: {
                value: null
            }
        }
    });
});
