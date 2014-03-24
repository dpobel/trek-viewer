/* global L */
YUI.add('trek-viewer', function (Y) {
    "use strict";

    var win = Y.config.win,
        HIDDEN_CHART_CLASS = 'is-chart-hidden',
        DEFAULT_CENTER = [46.37389, 2.4775],
        DEFAULT_ZOOM = 6,
        ZOOM_DETAILS = 15,
        CHART_LABEL_INCREMENT = 5;

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
            this.on('*:loadGPXUrl', function (e) {
                this._loadGpxUrl(e.url);
            });

            this.on('*:loadNew', function () {
                this._resetState();
                this.navigate('#/');
            });

            this.on('*:fitMap', function () {
                this.get('map').fitBounds(this.get('gpxLine').getBounds());
            });

            this.on('*:zoomStart', function () {
                this.get('map').setView(this.get('track').getStartPoint(), ZOOM_DETAILS);
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


            this.after('gpxChange', function (e) {
                var track;
               
                if ( e.newVal === null ) {
                    this.get('map')
                        .removeLayer(this.get('gpxLine'))
                        .removeLayer(this.get('start'))
                        .setView(DEFAULT_CENTER, DEFAULT_ZOOM);
                    this.set('gpxLine', null);
                    this.set('track', null);
                    this.set('start', null);
                    this.get('chart').destroy(true);
                } else {
                    track = this.get('gpx').get('tracks')[0];
                    this.set('track', track);
                    this.set('gpxLine', L.polyline(track.get('points')));
                    this.set('start', L.marker(track.getStartPoint()));
                    this.get('map')
                        .addLayer(this.get('gpxLine'))
                        .addLayer(this.get('start'))
                        .setView(track.getStartPoint(), ZOOM_DETAILS);
                    this._createProfileChart();
                }
            });
        },

        _resetState: function () {
            this.get('container').addClass(HIDDEN_CHART_CLASS);
            this.set('gpx', null);
        },

        _loadGpxUrl: function (url) {
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
                        try {
                            gpx = new Y.TV.GPXFile({
                                xml: req.response
                            });
                        } catch (e) {
                            // TODO handle error
                            console.error(e);
                        }
                        app.set('gpx', gpx);
                        app.navigate('#/details/' + win.encodeURIComponent(url));
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

        _createProfileChart: function () {
            var track = this.get('track'),
                chartData = track.get('elevation'),
                distance = track.get('distance') / 1000,
                app = this,
                labelValues = [],
                chart, progressMarker, i;

            for(i = 0; i != Math.round(distance/CHART_LABEL_INCREMENT)+1; i++) {
                labelValues[i] = i * CHART_LABEL_INCREMENT;
            }

            chart = new Y.Chart({
                type: "line",
                axes: {
                    altitude: {
                        keys: ['elevation'],
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
                'maximum': distance,
                'labelValues': labelValues
            });
            chart.on('planarEvent:mouseover', function (e) {
                var point = track.get('points')[e.index];

                if ( !progressMarker ) {
                    progressMarker = new L.Marker(point);
                    progressMarker.addTo(app.get('map'));
                } else {
                    progressMarker.setLatLng(point);
                }
                app.get('map').panTo(
                    point, {animate: false}
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
                        track: app.get('track')
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

            track: {
                value: null
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

            gpxLine: {
                value: null
            },

            start: {
                value: null
            },

            chart: {
                value: null
            }
        }
    });
});
