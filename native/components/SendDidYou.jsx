import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { t, tMiss } from "../../src/lib/i18n.js";
import { listFriends, personName, sendDidI } from "../../src/lib/people.js";
import { repeatFrom, senderLastDid } from "../../src/lib/send-repeat.js";
import { boardDate } from "../../src/lib/recurrence.js";
import {
  makeDidYouLink,
  sharedDidYouLine,
} from "../../src/lib/did-you-links.js";
import { passAlong } from "../../src/lib/native.js";
import { Pill } from "../screens/questions.jsx";
import { fonts } from "../theme.js";
import { DidButton, Field, KeyButton, Meta } from "./ui.jsx";
import { KeyboardLift } from "./KeyboardLift.jsx";
import { goHash } from "../navigation/hash.js";
import { confirmDone } from "../lib/confirm.js";
import { pressFx, Reveal } from "../lib/motion.jsx";
import { Avatar } from "./PersonCard.jsx";

// Your own last Did of the same every so often question, if you have one,
// so they see "Last time: 12 days ago" on the ask.
/**
 * Write a did you for a friend or someone in the family. With `pick` and no
 * person, it first asks who: a friend, or a link to text anyone.
 */
export function SendSheet({ person: given, book = null, pick = false, family = false, colors, onClose, onSent }) {
  const [person, setPerson] = useState(given || null);
  const [asLink, setAsLink] = useState(!pick);
  const [friends, setFriends] = useState(null);
  const [loadMiss, setLoadMiss] = useState("");
  const picking = pick && !person && !asLink;
  useEffect(() => {
    if (!picking || friends) return undefined;
    let live = true;
    listFriends()
      .then((out) => {
        if (live) setFriends(out.friends);
      })
      .catch(() => {
        if (live) {
          setFriends([]);
          setLoadMiss(t("people.reach"));
        }
      });
    return () => {
      live = false;
    };
  }, [picking, friends]);
  const [question, setQuestion] = useState("");
  const [note, setNote] = useState("");
  const [miss, setMiss] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState("");
  const [cadence, setCadence] = useState("once");
  const [days, setDays] = useState([]);
  const [everyDays, setEveryDays] = useState(7);
  const name = personName(person) || t("people.someone");
  // No person: only a link, to text anyone, friend or not.
  const linkOnly = !person;

  async function send() {
    if (!question.trim()) {
      setMiss(t("people.sendBlank"));
      return;
    }
    if (cadence === "weekly" && !days.length) {
      setMiss(t("we.missDays"));
      return;
    }
    setBusy(true);
    const { miss: why } = await sendDidI(
      person.user_id,
      question,
      note,
      undefined,
      repeatFrom(cadence, days, everyDays),
      cadence === "every" ? senderLastDid(book, question, boardDate(new Date())) : "",
    );
    setBusy(false);
    if (why === "already") return setMiss(t("people.sendAlready"));
    if (why) return setMiss(tMiss(why));
    onSent(t("people.sentTo", { name }));
    onClose();
  }

  // The same question as a did-i.app/d/CODE link anyone can open.
  async function shareLink() {
    setSaid("");
    if (!question.trim()) {
      setMiss(t("people.sendBlank"));
      return;
    }
    setMiss("");
    setBusy(true);
    const { code, miss: why } = await makeDidYouLink(question);
    setBusy(false);
    if (why === "linkCap") return setMiss(t("didYouLink.cap"));
    if (why || !code) return setMiss(tMiss(why || "people.reach"));
    const how = await passAlong(
      sharedDidYouLine(question, code, t('people.sendWhat')),
      t("didYouLink.share"),
    );
    if (how === "copied") setSaid(t("didYouLink.copied"));
    else if (how === "shared") confirmDone(t("confirm.shared"));
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardLift>
        <Pressable
          accessible={false}
          style={[styles.veil, { backgroundColor: colors.veil }]}
          onPress={onClose}
        >
          <Pressable
            accessible={false}
            style={[
              styles.pop,
              { backgroundColor: colors.panel, borderColor: colors.line },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            {picking ? (
              <Reveal style={styles.pickList}>
                <Text style={[styles.popKicker, { color: colors.on }]}>{t("people.sendTitle")}</Text>
                <Meta colors={colors}>{t("didYouLink.pickWho")}</Meta>
                {friends === null ? <Meta colors={colors}>{t("family.loading")}</Meta> : null}
                {friends?.map((row) => (
                  <Pressable
                    key={row.person.user_id}
                    onPress={() => setPerson(row.person)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.pickRow, { borderColor: colors.line }, pressFx(pressed)]}
                  >
                    <Avatar person={row.person} colors={colors} />
                    <Text style={[styles.pickName, { color: colors.ink }]} numberOfLines={1}>
                      {personName(row.person) || t("people.someone")}
                    </Text>
                    <Text style={[styles.pickChev, { color: colors.inkDim }]}>›</Text>
                  </Pressable>
                ))}
                {loadMiss ? <Text style={[styles.miss, { color: colors.miss }]}>{loadMiss}</Text> : null}
                <Pressable
                  onPress={() => setAsLink(true)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.pickRow, { borderColor: colors.line }, pressFx(pressed)]}
                >
                  <View style={styles.pickCopy}>
                    <Text style={[styles.pickName, { color: colors.on }]}>{t("didYouLink.asLink")}</Text>
                    <Text style={[styles.pickSub, { color: colors.inkDim }]}>{t("didYouLink.asLinkSub")}</Text>
                  </View>
                  <Text style={[styles.pickChev, { color: colors.inkDim }]}>›</Text>
                </Pressable>
                <KeyButton colors={colors} label={t("settings.neverMind")} onPress={onClose} />
              </Reveal>
            ) : (
            <Reveal key={person ? "to" : "link"} style={styles.pickList}>
            <Text style={[styles.popKicker, { color: colors.on }]}>
              {t(linkOnly ? "didYouLink.textTitle" : "people.sendTitle")}
            </Text>
            <Meta colors={colors}>
              {linkOnly
                ? t("didYouLink.textHint")
                : family
                  ? t("people.sendHintFamily", { name })
                  : t("people.sendHint", { name })}
            </Meta>
            <Field
              colors={colors}
              label={t("people.sendWhat")}
              value={question}
              onChangeText={setQuestion}
              placeholder={t("people.sendPh")}
            />
            {linkOnly ? null : (
              <>
                <View
                  style={styles.actions}
                  accessibilityRole="radiogroup"
                  accessibilityLabel={t("we.when")}
                >
                  {[
                    ["once", t("hang.once")],
                    ["daily", t("we.daily")],
                    ["weekly", t("we.someDays")],
                    ["every", t("hang.every")],
                  ].map(([id, label]) => (
                    <Pill
                      key={id}
                      label={label}
                      on={cadence === id}
                      onPress={() => setCadence(id)}
                      colors={colors}
                      radio
                    />
                  ))}
                </View>
                {cadence === "weekly" ? (
                  <View style={styles.actions}>
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                      const on = days.includes(day);
                      return (
                        <Pill
                          key={day}
                          label={t(`we.day.${day}`)}
                          on={on}
                          onPress={() =>
                            setDays(
                              on
                                ? days.filter((d) => d !== day)
                                : [...days, day].sort(),
                            )
                          }
                          colors={colors}
                        />
                      );
                    })}
                  </View>
                ) : null}
                {cadence === "every" ? (
                  <View style={styles.actions}>
                    {[
                      [7, t("hang.everyWeek")],
                      [14, t("hang.every2Weeks")],
                      [30, t("hang.everyMonth")],
                    ].map(([n, label]) => (
                      <Pill
                        key={n}
                        label={label}
                        on={everyDays === n}
                        onPress={() => setEveryDays(n)}
                        colors={colors}
                        radio
                      />
                    ))}
                  </View>
                ) : null}
                {cadence === "every" ? <Meta colors={colors}>{t("people.sendEveryHint")}</Meta> : null}
                <Field
                  colors={colors}
                  label={t("people.sendNote")}
                  value={note}
                  onChangeText={setNote}
                  placeholder={t("people.sendNotePh")}
                />
              </>
            )}
            {miss ? (
              <Text style={[styles.miss, { color: colors.miss }]}>{miss}</Text>
            ) : null}
            {said ? <Meta colors={colors}>{said}</Meta> : null}
            {linkOnly ? (
              <View style={styles.actions}>
                <DidButton
                  colors={colors}
                  small
                  label={t("didYouLink.share")}
                  disabled={busy || !question.trim()}
                  onPress={shareLink}
                />
                <KeyButton
                  colors={colors}
                  label={t("settings.neverMind")}
                  onPress={onClose}
                />
              </View>
            ) : (
              <>
                <View style={styles.actions}>
                  <DidButton
                    colors={colors}
                    small
                    label={t("people.send")}
                    disabled={busy || !question.trim()}
                    onPress={send}
                  />
                </View>
                <KeyButton
                  colors={colors}
                  label={t("didYouLink.share")}
                  disabled={busy || !question.trim()}
                  onPress={shareLink}
                />
              </>
            )}
            {person?.user_id ? (
              <KeyButton
                colors={colors}
                label={t("we.startWith", { name })}
                onPress={() => {
                  onClose?.();
                  goHash("/we/new", { id: person.user_id });
                }}
              />
            ) : null}
            {/* Cancel goes last, after every way to send. */}
            {linkOnly ? null : (
              <KeyButton colors={colors} label={t("settings.neverMind")} onPress={onClose} />
            )}
            </Reveal>
            )}
          </Pressable>
        </Pressable>
      </KeyboardLift>
    </Modal>
  );
}

const styles = StyleSheet.create({
  veil: { flex: 1, justifyContent: "center", padding: 20 },
  pop: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 10 },
  popKicker: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  miss: { fontFamily: fonts.ui, fontSize: 14 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pickList: { gap: 10 },
  pickRow: { flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  pickCopy: { flex: 1, gap: 2 },
  pickName: { flex: 1, fontFamily: fonts.uiSemi, fontSize: 15 },
  pickSub: { fontFamily: fonts.ui, fontSize: 13 },
  pickChev: { fontSize: 18 },
});
