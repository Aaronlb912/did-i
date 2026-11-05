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

// "2 left today" or "All done" with the ring, like targets/watch-widget.
// Tapping it opens the app.
class DidITileService : TileService() {
  override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
    val cards = CardStore.load(this)
    val palette = Palette(cards?.colors)
    // The watch app's numbers (MainActivity): Today's meter for the ring, and
    // a Not yet is not "All done".
    val total = cards?.countTotal ?: 0
    val done = cards?.countDone ?: 0
    val left = cards?.openCards?.size ?: 0
    val notYet = cards?.items?.count { it.status == "nope" } ?: 0
    val waiting = cards?.phoneWaiting ?: 0
    val line = when {
      cards == null || cards.stale -> cards?.openPhoneLabel?.orNull() ?: getString(R.string.open_phone)
      left > 0 -> fill(cards.leftLabel, "n" to left) ?: getString(R.string.left_n, left)
      // Did we cards wait on the phone: not "No questions yet", not "All done".
      notYet == 0 && waiting > 0 -> fill(cards.phoneWaitingLabel, "n" to waiting) ?: getString(R.string.waiting_n, waiting)
      cards.items.isEmpty() -> cards.openPhoneLabel.orNull() ?: getString(R.string.open_phone)
      notYet > 0 -> fill(cards.notYetLabel, "n" to notYet) ?: getString(R.string.not_yet_n, notYet)
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
      .setProgress(if (total > 0) done.coerceAtMost(total).toFloat() / total else 0f)
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
