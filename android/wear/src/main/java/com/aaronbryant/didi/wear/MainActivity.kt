package com.aaronbryant.didi.wear

import android.os.Bundle
import android.provider.Settings
import android.view.HapticFeedbackConstants
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathMeasure
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

// Mirrors targets/watch/DidIWatchApp.swift: ring, buddy, folder and
// "a of b", the question, then Not yet and Did. Done: buddy over a moon.
class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    CardStore.load(this)
    setContent { MaterialTheme { WatchApp() } }
  }

  override fun onResume() {
    super.onResume()
    CardStore.refresh(this)
  }
}

// Animator duration scale 0 is how Wear OS turns animations off.
@Composable
fun reduceMotion(): Boolean {
  val resolver = LocalContext.current.contentResolver
  return remember { Settings.Global.getFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f }
}

@Composable
fun WatchApp() {
  val cards = CardStore.cards.value
  // Not yet on a waiting card sends it to the back for this session only.
  var kept by remember { mutableStateOf(setOf<String>()) }
  val openPhone = cards?.openPhoneLabel?.orNull() ?: stringResource(R.string.open_phone)
  Box(Modifier.fillMaxSize().background(cards?.palette?.bg ?: Color.Black)) {
    when {
      cards == null -> MessageView(stringResource(R.string.app_name), openPhone)
      cards.stale -> MessageView(stringResource(R.string.app_name), openPhone)
      cards.items.isEmpty() -> MessageView(stringResource(R.string.app_name), cards.emptyLabel.orNull() ?: openPhone)
      cards.openCards.isNotEmpty() -> CardView(cards, cards.openCards.first())
      else -> {
        // Said Not yet to some: they are not done, so do not say all clear.
        // Show them one at a time with a Did button.
        val waiting = cards.items.firstOrNull { it.status == "nope" && !kept.contains(it.id + "|" + it.night) }
        val allDone = cards.allDoneLabel.orNull() ?: stringResource(R.string.all_done)
        when {
          waiting != null -> CardView(cards, waiting, onNope = { kept = kept + (waiting.id + "|" + waiting.night) })
          cards.streak > 0 -> DoneView(
            cards,
            allDone,
            if (cards.streak == 1) {
              cards.streakOneLabel.orNull() ?: fill(cards.streakLabel, "n" to 1) ?: stringResource(R.string.streak_one)
            } else {
              fill(cards.streakLabel, "n" to cards.streak) ?: stringResource(R.string.streak_n, cards.streak)
            },
            accentText = true,
          )
          else -> DoneView(cards, allDone, cards.clearLabel.orNull() ?: stringResource(R.string.nothing_left), accentText = false)
        }
      }
    }
  }
}

@Composable
fun MessageView(title: String, text: String) {
  Column(
    Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
    verticalArrangement = Arrangement.Center,
  ) {
    Text(title, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = Color.White)
    Spacer(Modifier.height(8.dp))
    Text(text, fontSize = 13.sp, color = Color(0xFF99A1B0), textAlign = TextAlign.Center)
  }
}

// Answered of tonight's, just inside the screen edge: a circle on round
// watches, a rounded square on square ones.
@Composable
fun ProgressRing(progress: Float, palette: Palette) {
  val round = LocalConfiguration.current.isScreenRound
  val reduce = reduceMotion()
  val shown by animateFloatAsState(
    progress.coerceIn(0f, 1f),
    animationSpec = if (reduce) snap() else tween(400),
    label = "ring",
  )
  Canvas(Modifier.fillMaxSize().clearAndSetSemantics {}) {
    val stroke = 4.dp.toPx()
    val inset = 3.dp.toPx() + stroke / 2
    val box = Size(size.width - inset * 2, size.height - inset * 2)
    if (round) {
      drawArc(palette.line, 0f, 360f, false, Offset(inset, inset), box, style = Stroke(stroke))
      drawArc(palette.accent, -90f, 360f * shown, false, Offset(inset, inset), box, style = Stroke(stroke, cap = StrokeCap.Round))
    } else {
      val r = 34.dp.toPx()
      val path = Path().apply { addRoundRect(RoundRect(inset, inset, inset + box.width, inset + box.height, CornerRadius(r, r))) }
      drawPath(path, palette.line, style = Stroke(stroke))
      if (shown > 0f) {
        val measure = PathMeasure().apply { setPath(path, false) }
        val part = Path()
        measure.getSegment(0f, measure.length * shown, part, true)
        drawPath(part, palette.accent, style = Stroke(stroke, cap = StrokeCap.Round))
      }
    }
  }
}

@Composable
fun CardView(cards: WatchCards, card: WatchCard, onNope: (() -> Unit)? = null) {
  val context = LocalContext.current
  val view = LocalView.current
  val palette = cards.palette
  val total = cards.countTotal
  val answered = cards.countDone
  val position = minOf(answered + 1, maxOf(total, 1))
  val count = fill(cards.countLabel, "a" to position, "b" to total) ?: stringResource(R.string.count, position, total)
  val caption = if (card.tag.isEmpty()) count else "${card.tag} · $count"
  Box(Modifier.fillMaxSize()) {
    ProgressRing(if (total > 0) answered.toFloat() / total else 0f, palette)
    Column(
      Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 22.dp, vertical = 18.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterVertically),
    ) {
      cards.buddy?.let { BuddyView(it, 40.dp) }
      Text(
        caption.uppercase(),
        fontSize = 11.sp,
        fontWeight = FontWeight.SemiBold,
        fontFamily = FontFamily.Monospace,
        color = palette.accent,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
      )
      Text(
        card.question,
        fontSize = 16.sp,
        fontWeight = FontWeight.Bold,
        color = palette.ink,
        textAlign = TextAlign.Center,
        maxLines = 4,
        overflow = TextOverflow.Ellipsis,
      )
      Row(
        Modifier.padding(top = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(18.dp),
        verticalAlignment = Alignment.Top,
      ) {
        RoundAnswer(
          check = false,
          label = cards.nopeLabel.orNull() ?: stringResource(R.string.not_yet),
          size = 46.dp,
          fill = palette.card2,
          stroke = palette.line,
          iconColor = palette.soft,
          labelColor = palette.soft,
        ) {
          if (onNope != null) onNope() else CardStore.answer(context, card, did = false)
        }
        RoundAnswer(
          check = true,
          label = cards.didLabel.orNull() ?: stringResource(R.string.did),
          size = 58.dp,
          fill = palette.accent,
          stroke = null,
          iconColor = palette.bg,
          labelColor = palette.ink,
        ) {
          if (CardStore.answer(context, card, did = true)) {
            view.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
          }
        }
      }
    }
  }
}

// A round button with a drawn clock or check, and its label under it.
@Composable
fun RoundAnswer(
  check: Boolean,
  label: String,
  size: Dp,
  fill: Color,
  stroke: Color?,
  iconColor: Color,
  labelColor: Color,
  onClick: () -> Unit,
) {
  Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(3.dp)) {
    Box(
      Modifier
        .size(size)
        .clip(CircleShape)
        .background(fill)
        .then(if (stroke != null) Modifier.border(1.dp, stroke, CircleShape) else Modifier)
        .semantics { contentDescription = label }
        .clickable(role = Role.Button, onClick = onClick),
      contentAlignment = Alignment.Center,
    ) {
      Canvas(Modifier.size(size * 0.38f)) {
        val w = this.size.width
        val sw = w * 0.16f
        if (check) {
          val path = Path().apply {
            moveTo(w * 0.08f, w * 0.52f)
            lineTo(w * 0.38f, w * 0.8f)
            lineTo(w * 0.92f, w * 0.2f)
          }
          drawPath(path, iconColor, style = Stroke(sw, cap = StrokeCap.Round))
        } else {
          drawCircle(iconColor, radius = w / 2 - sw / 2, style = Stroke(sw))
          drawLine(iconColor, center, Offset(w / 2, w * 0.24f), sw, StrokeCap.Round)
          drawLine(iconColor, center, Offset(w * 0.72f, w * 0.62f), sw, StrokeCap.Round)
        }
      }
    }
    Text(label, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = labelColor, maxLines = 1, modifier = Modifier.clearAndSetSemantics {})
  }
}

// All answered: buddy over a moon, then the title and a line under it.
@Composable
fun DoneView(cards: WatchCards, title: String, text: String, accentText: Boolean) {
  val palette = cards.palette
  val reduce = reduceMotion()
  var burst by remember { mutableStateOf(false) }
  LaunchedEffect(Unit) {
    if (!CardStore.justFinished.value) return@LaunchedEffect
    CardStore.justFinished.value = false
    // The haptic already played on the tap; the burst is motion only.
    if (!reduce) burst = true
  }
  Box(Modifier.fillMaxSize()) {
    Column(
      Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 22.dp, vertical = 18.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterVertically),
    ) {
      cards.buddy?.let { BuddyView(it, 40.dp) }
      Canvas(Modifier.size(64.dp, 56.dp).clearAndSetSemantics {}) {
        val c = Offset(size.width / 2, size.height / 2)
        drawCircle(
          Brush.radialGradient(listOf(palette.accent.copy(alpha = 0.22f), Color.Transparent), c, 32.dp.toPx()),
          radius = 32.dp.toPx(),
          center = c,
        )
        drawCircle(palette.ink, radius = 20.dp.toPx(), center = c)
        drawCircle(palette.bg, radius = 18.dp.toPx(), center = c + Offset(11.dp.toPx(), -7.dp.toPx()))
      }
      Text(title, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = palette.ink, textAlign = TextAlign.Center)
      Text(text, fontSize = 13.sp, color = if (accentText) palette.accent else palette.soft, textAlign = TextAlign.Center)
    }
    if (burst) CheerBurst(cards.cheer.mapNotNull { hexColor(it) }, palette.accent) { burst = false }
  }
}

// A few dots that fly out from the middle and fade, in the cheer colours.
@Composable
fun CheerBurst(colors: List<Color>, fallback: Color, onDone: () -> Unit) {
  val t = remember { Animatable(0f) }
  LaunchedEffect(Unit) {
    t.animateTo(1f, tween(600))
    onDone()
  }
  Canvas(Modifier.fillMaxSize().clearAndSetSemantics {}) {
    val count = 8
    val go = t.value
    for (i in 0 until count) {
      val angle = i.toDouble() / count * 2 * PI
      val tint = if (colors.isEmpty()) fallback else colors[i % colors.size]
      val d = 62.dp.toPx() * go
      drawCircle(
        tint.copy(alpha = tint.alpha * (1f - go)),
        radius = 3.5.dp.toPx() * (1f - 0.4f * go),
        center = center + Offset((cos(angle) * d).toFloat(), (sin(angle) * d).toFloat()),
      )
    }
  }
}

// The buddy on the widget's 48x58 grid, drawn the same way as buddyPart in
// widgets/DidITonightWidget.tsx. Accessories behind, buddy, accessories in front.
@Composable
fun BuddyView(buddy: WatchBuddy, width: Dp) {
  Canvas(Modifier.size(width, width * 58f / 48f).clearAndSetSemantics {}) {
    val k = size.width / 48f
    for (part in buddy.all) drawPart(part, k)
  }
}

fun DrawScope.drawPart(part: ShapePart, k: Float) {
  val tint = hexColor(part.text(5)) ?: return
  val n = part::num
  when (part.kind) {
    "e" -> {
      val alpha = if (n(7) != 0f) n(7) else 1f
      val c = Offset(n(1) * k, n(2) * k)
      rotate(n(6), c) {
        drawOval(tint.copy(alpha = tint.alpha * alpha), Offset((n(1) - n(3)) * k, (n(2) - n(4)) * k), Size(n(3) * 2 * k, n(4) * 2 * k))
      }
    }
    "r" -> {
      val w = n(3) * k
      val h = n(4) * k
      val topLeft = Offset(n(1) * k, n(2) * k)
      rotate(n(7), topLeft + Offset(w / 2, h / 2)) {
        drawRoundRect(tint, topLeft, Size(w, h), CornerRadius(n(6) * k, n(6) * k))
      }
    }
    "o" -> {
      // Stroke inside the oval, like SwiftUI strokeBorder.
      val sw = n(6) * k
      drawOval(
        tint,
        Offset((n(1) - n(3)) * k + sw / 2, (n(2) - n(4)) * k + sw / 2),
        Size(n(3) * 2 * k - sw, n(4) * 2 * k - sw),
        style = Stroke(sw),
      )
    }
    "l" -> {
      val dx = n(3) - n(1)
      val dy = n(4) - n(2)
      val len = sqrt(dx * dx + dy * dy)
      val w = n(6)
      val c = Offset((n(1) + n(3)) / 2 * k, (n(2) + n(4)) / 2 * k)
      rotate(Math.toDegrees(atan2(dy, dx).toDouble()).toFloat(), c) {
        drawRect(tint, Offset(c.x - len / 2 * k, c.y - w / 2 * k), Size(len * k, w * k))
      }
    }
    "t" -> {
      // Base centre (x, y), half width, height (positive points up).
      val path = Path().apply {
        moveTo((n(1) - n(3)) * k, n(2) * k)
        lineTo((n(1) + n(3)) * k, n(2) * k)
        lineTo(n(1) * k, (n(2) - n(4)) * k)
        close()
      }
      drawPath(path, tint)
    }
  }
}
