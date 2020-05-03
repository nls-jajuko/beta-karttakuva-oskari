import GeocodingView from './GeocodingView';

/** extension module class */
const UIDefaultExtension = Oskari.clazz.get('Oskari.userinterface.extension.DefaultModule');

export class GeocodingExtension extends UIDefaultExtension {
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

    afterStart(sandbox) {
        let tab = document.createElement("div"),
            title = this.getLocalization('tabTitle');

        let view = new GeocodingView(this);
        view.createUi(tab);
        this.view = view;

        sandbox.request(this, Oskari.requestBuilder('Search.AddTabRequest')(
            title, tab, 2, 'oskari_search_tabpanel_header'));


    }
}