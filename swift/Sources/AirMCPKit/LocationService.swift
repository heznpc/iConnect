// AirMCPKit — CoreLocation service shared between macOS and iOS.

import Foundation
import CoreLocation

public class LocationFetcher: NSObject, CLLocationManagerDelegate, @unchecked Sendable {
    private var continuation: CheckedContinuation<CLLocation, Error>?
    private var manager: CLLocationManager?

    public override init() { super.init() }

    public func fetch() async throws -> CLLocation {
        try await withCheckedThrowingContinuation { cont in
            self.continuation = cont
            let mgr = CLLocationManager()
            mgr.delegate = self
            mgr.desiredAccuracy = kCLLocationAccuracyBest
            self.manager = mgr
            mgr.requestLocation()
        }
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        continuation?.resume(returning: locations[0])
        continuation = nil
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        continuation?.resume(throwing: error)
        continuation = nil
    }
}

public func locationStatusString(_ status: CLAuthorizationStatus) -> String {
    switch status {
    case .notDetermined: return "not_determined"
    case .restricted: return "restricted"
    case .denied: return "denied"
    case .authorizedAlways: return "authorized_always"
    @unknown default: return "unknown"
    }
}
