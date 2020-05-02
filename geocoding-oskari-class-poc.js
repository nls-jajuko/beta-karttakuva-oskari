/* Geocoding Service for Oskari */
class GeocodingService {
    constructor(urls, epsgCode, lang) {
        this.urls = urls;
        this.queryParams = {
            'api-key': '7cd2ddae-9f2e-481c-99d0-404e7bc7a0b2',
            'sources': 'addresses,geographic-names',
            'crs': 'http://www.opengis.net/def/crs/EPSG/0/' + epsgCode,
            'lang': lang
        }

    }

    search(searchString) {
        let url =
            this.geocodingURL('search', {
                'size': '50',
                'text': searchString
            });

        if (this.geocoding_controller) {
            this.geocoding_controller.abort();
        }
        this.geocoding_controller = new AbortController();
        this.geocoding_signal = this.geocoding_controller.signal;

        return fetch(url, {
            method: 'get',
            signal: this.geocoding_signal
        });
    }

    similar(searchString) {
        let url = this.geocodingURL('similar', {
            'size': '10',
            'text': searchString
        });

        if (this.similar_controller) {
            this.similar_controller.abort();
        }
        this.similar_controller = new AbortController();
        this.similar_signal = this.similar_controller.signal;

        return fetch(url, {
            method: 'get',
            signal: this.similar_signal
        });

    }

    geocodingURL(urlkey, args) {
        let search = new URLSearchParams(),
            params = this.queryParams,
            combined = { ...params, ...args };
        for (let [key, value] of Object.entries(combined)) {
            search.append(key, value);
        }
        return this.urls[urlkey] + search.toString();
    }

}
/* Geocoding Tab for Oskari */
class GeocodingView extends Oskari.clazz.get('Oskari.mapframework.bundle.search.DefaultView') {
    constructor(instance) {
        super(instance);
        let epsg = this.sandbox.findRegisteredModuleInstance('MainMapModule').getProjection(),
            epsgCode = epsg.split(':')[1],
            lang = Oskari.getLang(),
            urls = {
                search: 'https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/v1/pelias/search?',
                similar: 'https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/v1/searchterm/similar?'
            };
        this.service = new GeocodingService(urls, epsgCode, lang);
        this.lastSearchString = undefined;
    }

    createUi(tab) {
        super.createUi(tab);
        let searchContainerEl = this.getContainer()[0],
            controlsEl = searchContainerEl.querySelector('div.controls'),
            similarEl = document.createElement('div');
        controlsEl.appendChild(similarEl)
        this.similarEl = similarEl;

    }

    __doSearch() {
        let self = this,
            field = this.getField(),
            button = this.getButton(),
            searchContainer = this.getContainer(),
            searchString = field.getValue(this.instance.safeChars),
            resultsEl = searchContainer[0].querySelectorAll('div.resultList'),
            infoEl = searchContainer[0].querySelectorAll('div.info');



        if (!searchString || searchString.length == 0) {
            self.progressSpinner.stop();
            field.setEnabled(true);
            button.setEnabled(true);
            return;
        }
        if (this.lastSearchString === searchString) {
            self.progressSpinner.stop();
            field.setEnabled(true);
            button.setEnabled(true);
            return;
        }

        while (resultsEl.firstChild)
            resultsEl.removeChild(resultsEl.firstChild);
        while (infoEl.firstChild)
            infoEl.removeChild(infoEl.firstChild);

        this.service.search(searchString).then(r => r.json()).then(json => {
            let res = {
                locations: json.features.map(f => {
                    return {
                        "zoomScale": 5000,
                        "name": f.properties.label,
                        "rank": f.properties.rank,
                        "lon": f.geometry.coordinates[0],
                        "id": f.properties.placeId,
                        "type": f.properties['label:placeType'],
                        "region": f.properties['label:municipality'],
                        "village": f.properties['label'],
                        "lat": f.geometry.coordinates[1],
                        "channelId": "GEOCODING"
                    }
                })
            };
            res.totalCount = res.locations.length;
            if (res.totalCount == 0) {
                res.totalCount = -2;
            }
            self.lastSearchString = searchString;
            self.handleSearchResult(true, res, searchString);

        }).catch(function (err) {
            /* we fail often due to autocomplete*/
        });
    }

    __doAutocompleteSearch() {
        let self = this,
            field = self.getField(),
            searchString = field.getValue(this.instance.safeChars);

        if (!searchString || searchString.length == 0) {
            return;
        }
        if (this.lastSimilarString === searchString) {
            return;
        }

        this.__doSearch();

        this.service.similar(searchString).then(r => r.json()).then(json => {
            if (!json.terms || !json.terms.length) {
                return;
            }

            let autocompleteValues = json.terms.map(f => {
                return {
                    value: f.text.indexOf(' ') != -1 ? '"' + f.text + '"' : f.text, data: f.text
                };
            });
            this.lastSimilarString = searchString;

            let similarEl = this.similarEl;
            while (similarEl.firstChild)
                similarEl.removeChild(similarEl.firstChild);

            autocompleteValues.forEach(e => {
                let spacing = document.createTextNode(' '),
                    el = document.createElement('a');
                el.setAttribute('href', 'javascript:void(0)');
                el.innerHTML = e.value;
                el.dataset.value = e.value;
                el.addEventListener("click", ev => {
                    field.setValue(ev.target.dataset.value);
                    self.__doAutocompleteSearch();
                });
                similarEl.appendChild(el);
                similarEl.appendChild(spacing);
            });

        }).catch(function (err) {
        });
    }

    _validateSearchKey(key) {
        return true;
    }

    __getSearchResultHeader(count, hasMore) {
        if (count < 0) {
            return "";
        }
        var intro = _.template(this.instance.getLocalization('searchResultCount') + ' ${count} ' +
            this.instance.getLocalization('searchResultCount2'));
        var msg = intro({ count: count });
        msg = msg + '<br/>';

        if (hasMore) {
            // more results available
            msg = msg + this.instance.getLocalization('searchResultDescriptionMoreResults');
            msg = msg + '<br/>';
        }
        return msg + this.instance.getLocalization('searchResultDescriptionOrdering');
    }
}

/** 'install' */
(function () {
    let tab = document.createElement("div"),
        sandbox = Oskari.getSandbox(),
        lang = Oskari.getLang(),
        search = sandbox.findRegisteredModuleInstance('Search'),
        title = {
            'fi': 'Geokoodauspalvelu',
            'sv': 'Geokodning',
            'en': 'Geocoding'
        }[lang];

    search.conf.autocomplete = true;

    let view = new GeocodingView(search);
    view.createUi(tab);

    sandbox.request(search, Oskari.requestBuilder('Search.AddTabRequest')(
        title, tab, 2, 'oskari_search_tabpanel_header'));
})();