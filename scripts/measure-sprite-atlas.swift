#!/usr/bin/env swift
import AppKit

let args = CommandLine.arguments
let path: String
if args.count > 1 {
  path = args[1]
} else {
  let here = URL(fileURLWithPath: args[0]).deletingLastPathComponent()
  path = here.appendingPathComponent("../public/textures/sprites.png").standardizedFileURL.path
}

guard let rep = NSImage(contentsOfFile: path)?.representations.first as? NSBitmapImageRep else {
  fputs("Could not read: \(path)\n", stderr)
  exit(1)
}

let w = rep.pixelsWide, h = rep.pixelsHigh
func sample(_ x: Int, _ y: Int) -> (Int, Int, Int, Int) {
  let c = rep.colorAt(x: x, y: y)!
  return (
    Int(c.redComponent * 255), Int(c.greenComponent * 255),
    Int(c.blueComponent * 255), Int(c.alphaComponent * 255),
  )
}
func isBg(_ r: Int, _ g: Int, _ b: Int, _ a: Int) -> Bool {
  if a < 12 { return true }
  return r >= 235 && g >= 235 && b >= 235
}

print("Image \(w)×\(h) — \(path)")
let names = ["vibration_zone", "ink_veil", "arc_spine", "stoneclaw"]
for (i, name) in names.enumerated() {
  let x0 = i * 80
  let x1 = x0 + 79
  var sminx = x1 + 1, sminy = h, smaxx = x0 - 1, smaxy = -1
  for y in 0 ..< h {
    for x in x0 ... x1 {
      let (r, g, b, a) = sample(x, y)
      if !isBg(r, g, b, a) {
        sminx = min(sminx, x); sminy = min(sminy, y)
        smaxx = max(smaxx, x); smaxy = max(smaxy, y)
      }
    }
  }
  if sminx <= smaxx {
    print("\(name): { x: \(sminx), y: \(sminy), w: \(smaxx - sminx + 1), h: \(smaxy - sminy + 1) }")
  } else {
    print("\(name): (empty column)")
  }
}
