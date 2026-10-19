// PlateShare Final Year Project - Flutter State Management
// Recommended File Path: lib/providers/auth_provider.dart

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import '../models/notification_model.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  UserModel? _user;
  String? _token;
  bool _isLoading = false;
  String? _error;
  List<NotificationModel> _notifications = [];
  int _unreadCount = 0;

  UserModel? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  String? get error => _error;
  List<NotificationModel> get notifications => _notifications;
  int get unreadCount => _unreadCount;
  bool get isAuthenticated => _token != null && _user != null;

  AuthProvider() {
    _loadSession();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  Future<void> _loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('plateshare_token');
    
    if (_token != null) {
      _isLoading = true;
      notifyListeners();
      try {
        final response = await ApiService.getMe();
        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          _user = UserModel.fromJson(data['user']);
          await fetchNotifications();
        } else {
          // Token expired
          await logout();
        }
      } catch (e) {
        _error = "Connection failed. Working offline.";
      } finally {
        _isLoading = false;
        notifyListeners();
      }
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiService.login(email, password);
      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        _token = data['token'];
        _user = UserModel.fromJson(data['user']);
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('plateshare_token', _token!);
        
        await fetchNotifications();
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = data['error'] ?? 'Login failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Failed to connect to server';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<Map<String, dynamic>> register(Map<String, dynamic> userData) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiService.register(userData);
      final data = jsonDecode(response.body);

      if (response.statusCode == 210 || response.statusCode == 201) {
        // If they registered as NGO, they won't automatically log in because verification is Pending
        if (userData['role'] == 'NGO') {
          _isLoading = false;
          notifyListeners();
          return {'success': true, 'pending': true, 'message': data['message']};
        }

        // For regular user roles, automatically log in
        _token = data['token'];
        _user = UserModel.fromJson(data['user']);
        
        final prefs = await SharedPreferences.getInstance();
        if (_token != null) {
          await prefs.setString('plateshare_token', _token!);
        }
        
        await fetchNotifications();
        _isLoading = false;
        notifyListeners();
        return {'success': true, 'pending': false, 'message': data['message']};
      } else {
        _error = data['error'] ?? 'Registration failed';
        _isLoading = false;
        notifyListeners();
        return {'success': false, 'message': _error};
      }
    } catch (e) {
      _error = 'Failed to connect to server';
      _isLoading = false;
      notifyListeners();
      return {'success': false, 'message': _error};
    }
  }

  Future<void> fetchNotifications() async {
    if (_token == null) return;
    try {
      final response = await ApiService.getNotifications();
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List list = data['notifications'] ?? [];
        _notifications = list.map((n) => NotificationModel.fromJson(n)).toList();
        _unreadCount = data['unreadCount'] ?? 0;
        notifyListeners();
      }
    } catch (e) {
      print('Error fetching notifications: $e');
    }
  }

  Future<void> markAsRead(String id) async {
    try {
      final response = await ApiService.markNotificationRead(id);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _notifications = _notifications.map((n) => n.id == id ? NotificationModel.fromJson(data['notification']) : n).toList();
        _unreadCount = data['unreadCount'] ?? _unreadCount;
        notifyListeners();
      }
    } catch (e) {
      print('Error marking notification as read: $e');
    }
  }

  Future<void> markAllAsRead() async {
    try {
      final response = await ApiService.markAllNotificationsRead();
      if (response.statusCode == 200) {
        _notifications = _notifications.map((n) {
          return NotificationModel(
            id: n.id,
            userId: n.userId,
            title: n.title,
            message: n.message,
            isRead: true,
            createdAt: n.createdAt,
          );
        }).toList();
        _unreadCount = 0;
        notifyListeners();
      }
    } catch (e) {
      print('Error marking all notifications read: $e');
    }
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    _notifications = [];
    _unreadCount = 0;
    _error = null;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('plateshare_token');
    
    notifyListeners();
  }
}
