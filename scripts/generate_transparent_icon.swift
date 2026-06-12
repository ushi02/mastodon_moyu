import AppKit
import Foundation

let outputPath = CommandLine.arguments.dropFirst().first ?? "/private/tmp/touchfish-transparent-icon.png"
let size = 1024
let scale = CGFloat(size) / 512.0

func point(_ x: CGFloat, _ y: CGFloat) -> NSPoint {
    NSPoint(x: x * scale, y: CGFloat(size) - (y * scale))
}

guard
    let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: size,
        pixelsHigh: size,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    )
else {
    fputs("Failed to create bitmap image rep.\n", stderr)
    exit(1)
}

bitmap.size = NSSize(width: size, height: size)

NSGraphicsContext.saveGraphicsState()
guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
    fputs("Failed to create graphics context.\n", stderr)
    exit(1)
}

NSGraphicsContext.current = context

NSColor.clear.setFill()
NSRect(x: 0, y: 0, width: size, height: size).fill()

let strokeColor = NSColor(
    calibratedRed: 0.553,
    green: 0.596,
    blue: 0.545,
    alpha: 1
)
strokeColor.setStroke()

let body = NSBezierPath()
body.move(to: point(154, 256))
body.curve(to: point(398, 256), controlPoint1: point(218, 152), controlPoint2: point(330, 152))
body.curve(to: point(154, 256), controlPoint1: point(330, 360), controlPoint2: point(218, 360))
body.lineWidth = 30 * scale
body.lineCapStyle = .round
body.lineJoinStyle = .round
body.stroke()

let tail = NSBezierPath()
tail.move(to: point(154, 256))
tail.curve(to: point(94, 176), controlPoint1: point(126, 226), controlPoint2: point(105, 198))
tail.curve(to: point(136, 256), controlPoint1: point(96, 210), controlPoint2: point(110, 238))
tail.curve(to: point(94, 336), controlPoint1: point(110, 274), controlPoint2: point(96, 302))
tail.curve(to: point(154, 256), controlPoint1: point(105, 314), controlPoint2: point(126, 286))
tail.lineWidth = 30 * scale
tail.lineCapStyle = .round
tail.lineJoinStyle = .round
tail.stroke()

let eye = NSBezierPath()
eye.appendArc(withCenter: point(340, 238), radius: 8 * scale, startAngle: 0, endAngle: 360)
eye.lineWidth = 16 * scale
eye.lineCapStyle = .round
eye.lineJoinStyle = .round
eye.stroke()

NSGraphicsContext.restoreGraphicsState()

guard let pngData = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Failed to encode PNG.\n", stderr)
    exit(1)
}

let outputURL = URL(fileURLWithPath: outputPath)
try FileManager.default.createDirectory(
    at: outputURL.deletingLastPathComponent(),
    withIntermediateDirectories: true
)
try pngData.write(to: outputURL)
print(outputPath)
