package com.earlyeyes.app.core.auth

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenManager @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    companion object {
        private val KEY_ACCESS_TOKEN  = stringPreferencesKey("access_token")
        private val KEY_REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        private val KEY_USER_ROLE     = stringPreferencesKey("user_role")
        private val KEY_USER_NAME     = stringPreferencesKey("user_name")
    }

    suspend fun saveTokens(
        accessToken: String,
        refreshToken: String,
        role: String,
        name: String
    ) {
        dataStore.edit { prefs ->
            prefs[KEY_ACCESS_TOKEN]  = accessToken
            prefs[KEY_REFRESH_TOKEN] = refreshToken
            prefs[KEY_USER_ROLE]     = role
            prefs[KEY_USER_NAME]     = name
        }
    }

    suspend fun getAccessToken(): String? =
        dataStore.data.map { it[KEY_ACCESS_TOKEN] }.firstOrNull()

    suspend fun getRefreshToken(): String? =
        dataStore.data.map { it[KEY_REFRESH_TOKEN] }.firstOrNull()

    suspend fun getUserRole(): String? =
        dataStore.data.map { it[KEY_USER_ROLE] }.firstOrNull()

    suspend fun getUserName(): String? =
        dataStore.data.map { it[KEY_USER_NAME] }.firstOrNull()

    suspend fun clearTokens() {
        dataStore.edit { it.clear() }
    }
}
