package com.aaronbryant.didi.widget;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * This phone's answer key (supabase/answer-keys.sql), with the project URL
 * and public anon key it posts to. Encrypted with an AES key that lives in
 * the Android Keystore and never leaves it; the prefs file holds only the
 * ciphertext. A restore onto another phone cannot decrypt it, so it reads as
 * no key and the app makes a new one.
 */
public final class AnswerKeyStore {
    private static final String PREFS = "didi-answer-key";
    private static final String ALIAS = "didi-answer-key";

    private AnswerKeyStore() {}

    private static SecretKey secret() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(ALIAS)) {
            return ((KeyStore.SecretKeyEntry) store.getEntry(ALIAS, null)).getSecretKey();
        }
        KeyGenerator maker = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        maker.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build());
        return maker.generateKey();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static synchronized boolean save(Context context, String json) {
        if (json == null || json.length() > 2000) return false;
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secret());
            byte[] body = cipher.doFinal(json.getBytes(StandardCharsets.UTF_8));
            return prefs(context).edit()
                .putString("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
                .putString("body", Base64.encodeToString(body, Base64.NO_WRAP))
                .commit();
        } catch (Exception error) {
            clear(context);
            return false;
        }
    }

    /** The saved JSON, or null when there is none or it cannot be read. */
    public static synchronized String read(Context context) {
        SharedPreferences saved = prefs(context);
        String iv = saved.getString("iv", null);
        String body = saved.getString("body", null);
        if (iv == null || body == null) return null;
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, secret(), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
            return new String(cipher.doFinal(Base64.decode(body, Base64.NO_WRAP)), StandardCharsets.UTF_8);
        } catch (Exception error) {
            return null;
        }
    }

    public static synchronized void clear(Context context) {
        prefs(context).edit().clear().commit();
    }
}
