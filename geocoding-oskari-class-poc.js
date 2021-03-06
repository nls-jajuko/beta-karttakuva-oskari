/* Geocoding Service for Oskari */
class GeocodingService {

    queryParams = {
        'api-key': '7cd2ddae-9f2e-481c-99d0-404e7bc7a0b2',
        'sources': 'geographic-names'
    }

    constructor(urls, epsgCode, lang) {
        this.urls = urls;
        this.queryParams = { ...this.queryParams, ...{
            crs : `http://www.opengis.net/def/crs/EPSG/0/${epsgCode}`,
            'request-crs': `http://www.opengis.net/def/crs/EPSG/0/${epsgCode}`,
            lang : lang } 
        };
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

    reverse(lonlat) {
        let url =
            this.geocodingURL('reverse', {
                'size': '20',
                'boundary.circle.radius': 100,
                'point.lon': lonlat.lon,
                'point.lat': lonlat.lat
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
            urls = instance.conf.urls;

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

    __checkSearchString(searchString) {
        if (!searchString || searchString.length == 0) {
            return false;
        }
        if (this.lastSearchString === searchString) {
            return false;
        }
        return true;
    }

    __doSearch() {
        let self = this,
            field = this.getField(),
            button = this.getButton(),
            searchContainer = this.getContainer(),
            searchString = field.getValue(this.instance.safeChars),
            resultsEl = searchContainer[0].querySelectorAll('div.resultList'),
            infoEl = searchContainer[0].querySelectorAll('div.info');



        if (!this.__checkSearchString(searchString)) {
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
                    value: f.text.indexOf(' ') != -1 ? '"' + f.text + '"' : f.text,
                    data: f.text
                };
            });
            this.lastSimilarString = searchString;

            self.renderSimilar(autocompleteValues);

        }).catch(function (err) {
        });
    }

    renderSimilar(autocompleteValues) {
        let similarEl = this.similarEl,
            self = this;
        while (similarEl.firstChild)
            similarEl.removeChild(similarEl.firstChild);

        autocompleteValues.forEach(e => {
            let spacing = document.createTextNode(' '),
                el = document.createElement('a');
            el.setAttribute('href', 'javascript:void(0)');
            el.innerHTML = e.value;
            el.dataset.value = e.value;
            el.addEventListener("click", ev => {
                self.getField().setValue(ev.target.dataset.value);
                self.__doAutocompleteSearch();
            });
            similarEl.appendChild(el);
            similarEl.appendChild(spacing);
        });
    }

    nearby(lonlat) {
        let self = this,
            field = this.getField(),
            searchContainer = this.getContainer(),
            searchString = field.getValue(this.instance.safeChars),
            resultsEl = searchContainer[0].querySelectorAll('div.resultList'),
            infoEl = searchContainer[0].querySelectorAll('div.info');

        while (resultsEl.firstChild)
            resultsEl.removeChild(resultsEl.firstChild);
        while (infoEl.firstChild)
            infoEl.removeChild(infoEl.firstChild);

        this.service.reverse(lonlat).then(r => r.json()).then(json => {
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

    _validateSearchKey(key) {
        return true;
    }

    __getSearchResultHeader(count, hasMore) {
        return "";
    }
}



Oskari.registerLocalization(
    {
        "lang": "fi",
        "key": "Geocoding",
        "value": {
            "title": "Haku",
            "desc": "",
            "tabTitle": "Geokoodauspalvelu",
            "invalid_characters": "Hakusanassa on kiellettyjä merkkejä. Sallittuja merkkejä ovat aakkoset (a-ö, A-Ö), numerot (0-9) sekä piste (.), pilkku (,), yhdysviiva (-) ja huutomerkki (!). Voit myös korvata sanassa yhden merkin kysymysmerkillä (?) tai sana loppuosan jokerimerkillä (*).",
            "searchDescription": "Hae paikkoja paikannimen, kunnan, seutukunnan sekä paikkatyyppien perusteella. Voit myös osoittaa paikkoja kartalta, jolloin haetaan lähimmät paikat. Huom! Kartoilla esitettävät karttanimet eivät ole samaa aineistoa.",
            "searchAssistance": "Anna hakusana",
            "searchResultCount": "Hakusanalla löytyi",
            "searchResultCount2": "hakutulosta.",
            "searchResultDescriptionMoreResults": "Rajaa hakutulosten määrää tarkentamalla hakusanaa.",
            "searchResultDescriptionOrdering": "Järjestä hakutulokset klikkaamalla sarakkeen otsikkoa alla olevassa taulukossa.",
            "searchResults": "Hakutulokset:",
            "searchResultsDescription": "hakutulosta hakusanalla",
            "searchservice_search_alert_title": "Virhe",
            "searchservice_search_not_found_anything_text": "Hakusanalla ei löytynyt yhtään hakutulosta. Tarkista hakusanan oikeinkirjoitus.",
            "too_short": "Hakusana on liian lyhyt. Hakusanassa on oltava vähintään yksi merkki. Jos käytät jokerimerkkiä (*), hakusanassa on oltava vähintään neljä muuta merkkiä.",
            "cannot_be_empty": "Hakusanassa on oltava vähintään yksi merkki.",
            "too_many_stars": "Hakusanassa saa olla enintään yksi jokerimerkki (*) sanan lopussa.",
            "generic_error": "Haku epäonnistui.",
            "grid": {
                "name": "Nimi",
                "village": "Kunta",
                "region": "Alue",
                "type": "Tyyppi"
            },
            "resultBox": {
                "close": "Sulje",
                "title": "Hakutulokset",
                "alternatives": "Tällä paikalla on seuraavia vaihtoehtoisia nimiä:"
            },
            "guidedTour": {
                "title": "Haku",
                "message": "Haku-valikossa voit hakea paikkoja tai paikkatietoja. <br/><br/>  Paikkahaku: Hae paikkoja paikannimen, osoitteen tai kiinteistötunnuksen perusteella. Klikkaa hakutulosta ja kartta keskittyy valittuun paikkaan. <br/><br/> Metatietohaku: Hae paikkatietoaineistoja, -aineistosarjoja ja -palveluja. Käytä tekstihakua tai valmiiksi määriteltyjä hakuehtoja. Hakutuloksista pääset lukemaan metatietokuvailun tai avaamaan valitun aineiston kartalla, jos karttataso on saatavilla.",
                "openLink": "Näytä Haku",
                "closeLink": "Piilota Haku",
                "tileText": "Haku"
            }
        }
    });

/** extension module class */
const BasicBundle = Oskari.clazz.get('Oskari.BasicBundle');

class GeocodingExtension extends BasicBundle {
    name = 'Geocoding';

    conf = {
        autocomplete: true,
        urls: {
            search: 'https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/v1/pelias/search?',
            similar: 'https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/v1/searchterm/similar?',
            reverse: 'https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/v1/pelias/reverse?'
        }

    }

    viewState = undefined;
    view = undefined;


    eventHandlers = {
        'userinterface.ExtensionUpdatedEvent': ev => {
            console.log(ev.getViewState(), ev.getViewInfo(), ev.getExtension().getName(), ev);
            if ("Search" === ev.getExtension().getName()) {
                this.viewState = ev.getViewState();
            }
        },
        'MapClickedEvent': ev => {
            let lonlat = ev.getLonLat();
            if (this.viewState && this.viewState !== "close") {
                this.view.nearby(lonlat);
            }
        }

    }

    getSandbox() { return this.sandbox; }
    getLocalization(key) { return this.locale[key]; }

    start(sandbox) {
        super.start(sandbox);

        this.locale = Oskari.getLocalization(this.name);
        let tab = document.createElement("div"),
            title = Oskari.getMsg(this.name,'tabTitle');

        let view = new GeocodingView(this);
        view.createUi(tab);
        this.view = view;

        sandbox.request(this, Oskari.requestBuilder('Search.AddTabRequest')(
            title, tab, 2, 'oskari_search_tabpanel_header'));


    }
}

/* bundle registry operations */
class GeocodingBundle {
    create() {
        return new GeocodingExtension();
    }
}

function register(impl, bundleId, implClassName) {
    Oskari.clazz.defineES(
        implClassName,
        impl, {
        "protocol": ["Oskari.bundle.Bundle",
            "Oskari.mapframework.bundle.extension.ExtensionBundle"],
        "bundle": {
            "manifest": {
                "Bundle-Identifier": bundleId,
                "Bundle-Name": bundleId,
                "Bundle-Version": "1.0.0",
            }
        }
    });

    Oskari.bundle_manager.installBundleClass(bundleId,
        implClassName);
}

register(GeocodingBundle, 'geocoding', "Oskari.geocoding.GeocodingBundle");



/* test */
new GeocodingBundle().create().start(Oskari.getSandbox());
Oskari.getSandbox().postRequestByName('userinterface.UpdateExtensionRequest',[undefined,'attach','Search'])
