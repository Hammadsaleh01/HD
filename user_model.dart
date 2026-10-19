// PlateShare Final Year Project - Flutter Model
// Recommended File Path: lib/models/user_model.dart

enum UserRole { Donor, NGO, Volunteer, Admin }

enum VerificationStatus { Pending, Approved, NA }

class UserModel {
  final String id;
  final String name;
  final String email;
  final String phone;
  final UserRole role;
  final String address;
  final VerificationStatus verificationStatus;
  final String? organizationName;
  final String? registrationNumber;
  final DateTime createdAt;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    required this.address,
    required this.verificationStatus,
    this.organizationName,
    this.registrationNumber,
    required this.createdAt,
  });

  // Factory constructor to parse User from JSON response
  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      role: _parseRole(json['role']),
      address: json['address'] ?? '',
      verificationStatus: _parseVerificationStatus(json['verificationStatus']),
      organizationName: json['organizationName'],
      registrationNumber: json['registrationNumber'],
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : DateTime.now(),
    );
  }

  // Convert User model to JSON payload
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'role': role.toString().split('.').last,
      'address': address,
      'verificationStatus': verificationStatus.toString().split('.').last == 'NA' 
          ? 'N/A' 
          : verificationStatus.toString().split('.').last,
      'organizationName': organizationName,
      'registrationNumber': registrationNumber,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  static UserRole _parseRole(String? roleStr) {
    switch (roleStr) {
      case 'Donor': return UserRole.Donor;
      case 'NGO': return UserRole.NGO;
      case 'Volunteer': return UserRole.Volunteer;
      case 'Admin': return UserRole.Admin;
      default: return UserRole.Donor;
    }
  }

  static VerificationStatus _parseVerificationStatus(String? statusStr) {
    switch (statusStr) {
      case 'Pending': return VerificationStatus.Pending;
      case 'Approved': return VerificationStatus.Approved;
      case 'N/A': return VerificationStatus.NA;
      default: return VerificationStatus.NA;
    }
  }
}
