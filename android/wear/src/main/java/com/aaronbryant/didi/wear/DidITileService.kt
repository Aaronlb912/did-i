package com.aaronbryant.didi.wear

import androidx.compose.ui.graphics.toArgb
import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DimensionBuilders.dp
import androidx.wear.protolayout.DimensionBuilders.expand
import androidx.wear.protolayout.DimensionBuilders.sp
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.ModifiersBuilders
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.protolayout.material.CircularProgressIndicator
import androidx.wear.protolayout.material.ProgressIndicatorColors
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture

// "2 left tonight" or "All done" with the ring, like targets/watch-widget.
// Tapping it opens the app.
class DidITileService : TileService() {
  override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
    val cards = CardStore.load(this)
    val palette = Palette(cards?.colors)
    val total = cards?.items?.size ?: 0
    val left = cards?.openCards?.size ?: 0
    val line = when {
      cards == null || total == 0 || cards.stale -> cards?.openPhoneLabel?.orNull() ?: getString(R.string.open_phone)
      left > 0 -> fill(cards.leftLabel, "n" to left) ?: getString(R.string.left_n, left)
      else -> cards.allDoneLabel.orNull() ?: getString(R.string.all_done)
    }
    val open = ModifiersBuilders.Clickable.Builder()
      .setId("open")
      .setOnClick(
        ActionBuilders.LaunchAction.Builder()
          .setAndroidActivity(
            ActionBuilders.AndroidActivity.Builder()
              .setPackageName(packageName)
              .setClassName(MainActivity::class.java.name)
              .build(),
          )
          .build(),
      )
      .build()
    val text = LayoutElementBuilders.Column.Builder()
      .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
      .addContent(label(getString(R.string.app_name), 14f, palette.soft.toArgb()))
      .addContent(LayoutElementBuilders.Spacer.Builder().setHeight(dp(4f)).build())
      .addContent(label(line, 18f, palette.accent.toArgb()))
      .build()
    val ring = CircularProgressIndicator.Builder()
      .setProgress(if (total > 0) (total - left).toFloat() / total else 0f)
      .setCircularProgressIndicatorColors(ProgressIndicatorColors(argb(palette.accent.toArgb()), argb(palette.line.toArgb())))
      .build()
    val root = LayoutElementBuilders.Box.Builder()
      .setWidth(expand())
      .setHeight(expand())
      .setModifiers(ModifiersBuilders.Modifiers.Builder().setClickable(open).build())
      .addContent(ring)
      .addContent(text)
      .build()
    val tile = TileBuilders.Tile.Builder()
      .setResourcesVersion(RESOURCES)
      .setFreshnessIntervalMillis(30 * 60 * 1000L)
      .setTileTimeline(TimelineBuilders.Timeline.fromLayoutElement(root))
      .build()
    return Futures.immediateFuture(tile)
  }

  override fun onTileResourcesRequest(requestParams: RequestBuilders.ResourcesRequest): ListenableFuture<ResourceBuilders.Resources> =
    Futures.immediateFuture(ResourceBuilders.Resources.Builder().setVersion(RESOURCES).build())

  private fun label(text: String, size: Float, color: Int) =
    LayoutElementBuilders.Text.Builder()
      .setText(text)
      .setMaxLines(2)
      .setFontStyle(
        LayoutElementBuilders.FontStyle.Builder()
          .setSize(sp(size))
          .setColor(argb(color))
          .build(),
      )
      .build()

  private companion object {
    const val RESOURCES = "1"
  }
}
