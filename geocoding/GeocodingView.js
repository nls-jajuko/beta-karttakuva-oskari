import GeocodingService from './GeocodingService';

const SearchDefaultView = Oskari.clazz.get('Oskari.mapframework.bundle.search.DefaultView');

/* Geocoding Tab for Oskari */
export class GeocodingView extends SearchDefaultView {
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
