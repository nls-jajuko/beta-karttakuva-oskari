import GeocodingExtension from './GeocodingExtension';


/* bundle registry operations */
class GeocodingBundle {
    create() {
        return new GeocodingExtension();
    }
}

Oskari.clazz.defineES(
    "Oskari.geocoding.GeocodingBundle",
    GeocodingBundle, {
    "protocol": ["Oskari.bundle.Bundle",
        "Oskari.mapframework.bundle.extension.ExtensionBundle"],
    "bundle": {
        "manifest": {
            "Bundle-Identifier": "geocoding",
            "Bundle-Name": "geocoding",
            "Bundle-Version": "1.0.0",
        }
    }
});

Oskari.bundle_manager.installBundleClass("geocoding",
    "Oskari.geocoding.GeocodingBundle");
