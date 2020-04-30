/* Quick Geocoding Tab for Oskari */
Oskari.clazz.define('Oskari.mapframework.bundle.search.GeocodingView',
    function (instance) {
        this.instance = instance;
        this.sandbox = this.instance.getSandbox();
        this.searchservice = instance.service;
        this.state = null;
        this.lastResult = null;
        this.lastSort = null;
        this.resultActions = {};
        this._searchContainer = null;

        this.resultHeaders = [
            {
                title: this.instance.getLocalization('grid').name,
                prop: 'name'
            }, {
                title: this.instance.getLocalization('grid').region,
                prop: 'region'
            }, {
                title: this.instance.getLocalization('grid').type,
                prop: 'type'
            }
        ];
        this.progressSpinner = Oskari.clazz.create('Oskari.userinterface.component.ProgressSpinner');
    },
    {
        __doSearch: function () {
            var me = this;
            var field = this.getField();
            var button = this.getButton();
            var searchContainer = this.getContainer();

            searchContainer.find('div.resultList').empty();
            searchContainer.find('div.info').empty();
            var searchString = field.getValue(this.instance.safeChars);

            if (!this._validateSearchKey(field.getValue(false))) {
                field.setEnabled(true);
                button.setEnabled(true);
                return;
            }

            var self = this,
                lang = Oskari.getLang(),
                sb = this.sandbox || Oskari.getSandbox(),
                evtBuilder = Oskari.eventBuilder('SearchResultEvent');

            var url = 'https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/v1/pelias/search?' 
                  +'&lang='+lang
                  +'&api-key=7cd2ddae-9f2e-481c-99d0-404e7bc7a0b2'
                  +'&crs=http://www.opengis.net/def/crs/EPSG/0/3067' ///? EPSG
                  +'&size=50'
                  +'&text=' + searchString

            fetch(url).
                then(r => r.json()).
                then(json => {
                    let res = {
                        "methods": [
                            {},
                            {},
                            {}
                        ],
                        "locations": [],
                        "totalCount": 0
                    };

                    res.locations = json.features.map(f => {
                        let fprops = f.properties;
                        return {
                            "zoomScale": 5000,
                            "name": fprops.label,
                            "rank": fprops.rank,
                            "lon": f.geometry.coordinates[0],
                            "id": fprops.placeId,
                            "type": fprops['label:placeType'],
                            "region": fprops['label:municipality'],
                            "village": fprops['label'],
                            "lat": f.geometry.coordinates[1],
                            "channelId": "REGISTER_OF_NOMENCLATURE_CHANNEL"
                        };
                    });
                    res.totalCount = res.locations.length;
                    self.handleSearchResult(true, res, searchString);
                });
        },
        __doAutocompleteSearch: function () {
            this.__doSearch();

        },
        _validateSearchKey: function (key) { return true; }


    },
    {
        extend: ['Oskari.mapframework.bundle.search.DefaultView']
    }
)

/** hack */
function add() {
    var ui = jQuery('<div />'),
        sandbox = Oskari.getSandbox(),
        lang = Oskari.getLang(),
        search = sandbox.findRegisteredModuleInstance('Search'),
        title = {
            'fi': 'Geokoodauspalvelu',
            'sv': 'Geokodning',
            'en': 'Geocoding'
        }[lang];

    search.conf.autocomplete = true;

    var view = Oskari.clazz.create('Oskari.mapframework.bundle.search.GeocodingView', search);
    view.createUi(ui);
    var priority = this.tabPriority,
        id = 'oskari_metadatacatalogue_tabpanel_header',
        reqBuilder = Oskari.requestBuilder('Search.AddTabRequest'),
        req = reqBuilder(title, ui, priority, id);

    sandbox.request(search, req);
}

add();

