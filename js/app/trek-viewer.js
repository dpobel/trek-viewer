/* global L */
YUI.add('trek-viewer', function (Y) {
    "use strict";

    var win = Y.config.win,
        HIDDEN_CHART_CLASS = 'is-chart-hidden',
        DEFAULT_CENTER = [46.37389, 2.4775],
        DEFAULT_ZOOM = 6,
        ZOOM_DETAILS = 15,
        MAX_ZOOM = 16, // SCAN25TOUR is not able to do more
        CHART_LABEL_INCREMENT = 5,
        TOOLTIP_TPL = 'Distance: {distance}&nbsp;km<br>Elevation: {elevation}&nbsp;m';

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
                    if ( this.get('progressMarker') ) {
                        this.get('map').removeLayer(this.get('progressMarker'));
                        this.set('progressMarker', null);
                    }
                    this.set('gpxLine', null);
                    this.set('track', null);
                    this.set('start', null);
                    this.get('chart').destroy(true);
                    if ( this.get('progressLine') ) {
                        this.get('progressLine').destroy(true);
                    }
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
            var gpxFile = `https://corsproxy.io/?${encodeURIComponent(url)}`,
                app = this, io,
                gpx;

            //gpxFile = 'ramasse-meillonas.gpx';
            //gpxFile = 'vic.gpx';

            this.get('viewContainer').addClass('is-loading');
            io = new Y.IO();
            io.send(gpxFile, {
                xdr: {use: 'native'},
                on: {
                    success: function (id, req) {
                        try {
                            gpx = new Y.TV.GPXFile({
                                xml: req.response
                            });
                        } catch (e) {
                            // TODO handle error
                            alert("Erreur lors du chargement de " + url + " :(");
                            console.error(e);
                        }
                        app.set('gpx', gpx);
                        app.navigate('#/details/' + win.encodeURIComponent(url));
                    },
                    failure: function (id, req) {
                        // TODO handle error
                        alert("Erreur lors du chargement de " + url + " :(");
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
                chartMinEle, chartMaxEle, eleOffset,
                distance = track.get('distance') / 1000,
                labelValues = [],
                chart, i;

            for(i = 0; i != Math.round(distance/CHART_LABEL_INCREMENT)+1; i++) {
                labelValues[i] = i * CHART_LABEL_INCREMENT;
            }

            eleOffset = track.get('elevationBounds').max.elevation * 0.05;

            chartMinEle = Math.round((track.get('elevationBounds').min.elevation - eleOffset)/10) * 10;
            chartMaxEle = Math.round((track.get('elevationBounds').max.elevation + eleOffset)/10) * 10;

            chart = new Y.Chart({
                type: "line",
                axes: {
                    elevation: {
                        keys: ['elevation'],
                        title: 'Altitude',
                        type: "numeric",
                        position: "left",
                        minimum: chartMinEle,
                        maximum: chartMaxEle
                    }
                },
                categoryKey: "distance",
                categoryType: "numeric",
                horizontalGridlines: true,
                verticalGridlines: true,
                dataProvider: chartData,
                interactionType: "planar",
                tooltip: {
                    planarLabelFunction: function (categoryAxis, valueItems, index) {
                        return Y.Lang.sub(TOOLTIP_TPL, {
                            distance: this.get('dataProvider')[index].distance.toFixed(1),
                            elevation: valueItems[0].value.toFixed(1)
                        });
                    },
                    setTextFunction: function (textField, data) {
                        Y.one(textField).setContent(data);
                    },
                },
                styles: {
                    axes: {
                        elevation: {
                            label: {
                                color: "#bbb"
                            },
                            title: {
                                color: "#bbb"
                            }
                        },
                        distance: {
                            label: {
                                color: "#bbb"
                            }
                        }
                    },
                    series: {
                        elevation: {
                            line: {
                                weight: 5,
                                color: "#03f",
                                alpha: 0.7
                            }
                        }
                    }
                }
            });
            chart.getCategoryAxis().setAttrs({
                'mininum': 0,
                'maximum': distance,
                'labelValues': labelValues
            });
            this.set('chart', chart);
            chart.on(
                'planarEvent:mouseover', Y.bind(this._handleChartProgress, this)
            );
        },

        _handleChartProgress: function (e) {
            var point = this.get('track').get('points')[e.index];

            this._moveProgressMarkerTo(point);
            this._moveProgressLine(e.x);
        },

        _moveProgressMarkerTo: function (point) {
            var progressMarker = this.get('progressMarker');

            if ( !progressMarker ) {
                progressMarker = L.marker(point);
                this.set('progressMarker', progressMarker);
                progressMarker.addTo(this.get('map'));
            }
            progressMarker.setLatLng(point);
            this.get('map').panTo(point, {animate: false});
        },

        _moveProgressLine: function (x) {
            var line = this.get('progressLine'),
                chart = this.get('chart');

            chart.get('graph').get('graphic').set('autoDraw', true);
            if ( !line ) {
                this.set(
                    'progressLine',
                    chart.get('graph').get('graphic').addShape({
                        type: "path",
                        stroke: {
                            weight: 1,
                            color: "#333"
                        }
                    })
                );
                line = this.get('progressLine');
            }

            line.clear();
            line.moveTo(
                x - chart.get('axes').elevation.get('width'),
                0
            );
            line.lineTo(
                x - chart.get('axes').elevation.get('width'),
                chart.get('graph').get('graphic').get('height')
            );
            line.end();
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
                + "LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR&STYLE=normal&TILEMATRIXSET=PM&"
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
                        maxZoom: MAX_ZOOM,
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

            progressMarker: {
                value: null
            },

            progressLine: {
                value: null
            },

            chart: {
                value: null
            }
        }
    });
});
