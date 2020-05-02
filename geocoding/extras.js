
export function register(impl, bundleId, implClassName) {
    Oskari.clazz.defineES(
        implClassName,
        impl, {
        "protocol": ["Oskari.bundle.Bundle",
            "Oskari.mapframework.bundle.extension.ExtensionBundle"],
        "bundle": {
            "manifest": {
                "Bundle-Identifier": bundleId,
                "Bundle-Name": GeocodingbundleId,
                "Bundle-Version": "1.0.0",
            }
        }
    });

    Oskari.bundle_manager.installBundleClass(bundleId,
        implClassName);
}