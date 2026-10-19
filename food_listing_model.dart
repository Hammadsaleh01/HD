// PlateShare Final Year Project - Flutter Model
// Recommended File Path: lib/models/food_listing_model.dart

enum ListingStatus { Available, Completed, Expired }

class FoodListingModel {
  final String id;
  final String donorId;
  final String donorName;
  final String foodName;
  final String foodType; // e.g. Veg, Non-Veg, Bakery, Groceries
  final double quantity; // in kg
  final String description;
  final String pickupAddress;
  final DateTime pickupTime;
  final DateTime expiryTime;
  final String image;
  final ListingStatus status;
  final DateTime createdAt;

  FoodListingModel({
    required this.id,
    required this.donorId,
    required this.donorName,
    required this.foodName,
    required this.foodType,
    required this.quantity,
    required this.description,
    required this.pickupAddress,
    required this.pickupTime,
    required this.expiryTime,
    required this.image,
    required this.status,
    required this.createdAt,
  });

  factory FoodListingModel.fromJson(Map<String, dynamic> json) {
    return FoodListingModel(
      id: json['id'] ?? '',
      donorId: json['donorId'] ?? '',
      donorName: json['donorName'] ?? '',
      foodName: json['foodName'] ?? '',
      foodType: json['foodType'] ?? 'Veg',
      quantity: (json['quantity'] as num?)?.toDouble() ?? 0.0,
      description: json['description'] ?? '',
      pickupAddress: json['pickupAddress'] ?? '',
      pickupTime: json['pickupTime'] != null 
          ? DateTime.parse(json['pickupTime']) 
          : DateTime.now(),
      expiryTime: json['expiryTime'] != null 
          ? DateTime.parse(json['expiryTime']) 
          : DateTime.now(),
      image: json['image'] ?? '',
      status: _parseStatus(json['status']),
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'donorId': donorId,
      'donorName': donorName,
      'foodName': foodName,
      'foodType': foodType,
      'quantity': quantity,
      'description': description,
      'pickupAddress': pickupAddress,
      'pickupTime': pickupTime.toIso8601String(),
      'expiryTime': expiryTime.toIso8601String(),
      'image': image,
      'status': status.toString().split('.').last,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  static ListingStatus _parseStatus(String? statusStr) {
    switch (statusStr) {
      case 'Available': return ListingStatus.Available;
      case 'Completed': return ListingStatus.Completed;
      case 'Expired': return ListingStatus.Expired;
      default: return ListingStatus.Available;
    }
  }
}
