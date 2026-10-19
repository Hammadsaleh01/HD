// PlateShare Final Year Project - Flutter Mobile API Service
// File Path: mobile/lib/services/api_service.dart

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Replace with your hosted backend URL, e.g., 'https://your-plateshare-api.com/api'
  // Or 'http://10.0.2.2:3000/api' for Android Emulator local testing
  static const String baseUrl = 'http://10.0.2.2:3000/api';

  static Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('plateshare_token');
    
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  /// Extracts error message from standard { error: { code, message } } response shape
  static String parseErrorMessage(http.Response response) {
    try {
      final data = jsonDecode(response.body);
      if (data is Map && data.containsKey('error')) {
        final err = data['error'];
        if (err is Map && err.containsKey('message')) {
          return err['message'].toString();
        }
        return err.toString();
      }
      return 'Request failed with status: ${response.statusCode}';
    } catch (_) {
      return 'Unexpected network or server error (${response.statusCode})';
    }
  }

  // --- Authentication ---
  static Future<http.Response> register(Map<String, dynamic> userData) async {
    final url = Uri.parse('$baseUrl/auth/register');
    return await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(userData),
    );
  }

  static Future<http.Response> login(String email, String password) async {
    final url = Uri.parse('$baseUrl/auth/login');
    return await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );
  }

  static Future<http.Response> forgotPassword(String email) async {
    final url = Uri.parse('$baseUrl/auth/forgot-password');
    return await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email}),
    );
  }

  static Future<http.Response> resetPassword(String token, String newPassword) async {
    final url = Uri.parse('$baseUrl/auth/reset-password');
    return await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'token': token,
        'newPassword': newPassword,
      }),
    );
  }

  static Future<http.Response> getMe() async {
    final url = Uri.parse('$baseUrl/auth/me');
    final headers = await _getHeaders();
    return await http.get(url, headers: headers);
  }

  // --- Food Listings ---
  static Future<http.Response> getAllListings() async {
    final url = Uri.parse('$baseUrl/listings');
    final headers = await _getHeaders();
    return await http.get(url, headers: headers);
  }

  static Future<http.Response> getMyListings() async {
    final url = Uri.parse('$baseUrl/listings/my');
    final headers = await _getHeaders();
    return await http.get(url, headers: headers);
  }

  static Future<http.Response> createListing(Map<String, dynamic> listingData) async {
    final url = Uri.parse('$baseUrl/listings');
    final headers = await _getHeaders();
    return await http.post(
      url,
      headers: headers,
      body: jsonEncode(listingData),
    );
  }

  static Future<http.Response> schedulePickup(String listingId, {String? scheduledTime}) async {
    final url = Uri.parse('$baseUrl/listings/$listingId/schedule-pickup');
    final headers = await _getHeaders();
    return await http.post(
      url,
      headers: headers,
      body: jsonEncode({
        if (scheduledTime != null) 'scheduledTime': scheduledTime,
      }),
    );
  }

  static Future<http.Response> confirmHandover(String listingId) async {
    final url = Uri.parse('$baseUrl/listings/$listingId/confirm-handover');
    final headers = await _getHeaders();
    return await http.post(url, headers: headers);
  }

  // --- Allocations ---
  static Future<http.Response> confirmAllocationReceipt(String allocationId) async {
    final url = Uri.parse('$baseUrl/allocations/confirm');
    final headers = await _getHeaders();
    return await http.post(
      url,
      headers: headers,
      body: jsonEncode({'allocationId': allocationId}),
    );
  }

  // --- Notifications ---
  static Future<http.Response> getNotifications() async {
    final url = Uri.parse('$baseUrl/notifications');
    final headers = await _getHeaders();
    return await http.get(url, headers: headers);
  }

  static Future<http.Response> markNotificationRead(String id) async {
    final url = Uri.parse('$baseUrl/notifications/$id/read');
    final headers = await _getHeaders();
    return await http.patch(url, headers: headers);
  }
}
