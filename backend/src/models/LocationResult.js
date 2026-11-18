import mongoose from 'mongoose';

/**
 * DOERA AI — Location Result Schema
 * Persists authentic geospatial locations, coordinates, and verified provider attributes.
 */
const LocationResultSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      default: 'Verified Address on Record',
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    phone: {
      type: String,
      default: null,
    },
    rating: {
      type: Number,
      default: null,
    },
    reviewsCount: {
      type: Number,
      default: null,
    },
    price: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    source: {
      type: String,
      default: 'OpenStreetMap Nominatim / Overpass',
    },
    sourceUrl: {
      type: String,
      default: null,
    },
    distanceKm: {
      type: Number,
      default: null,
    },
    travelTime: {
      type: String,
      default: null,
    },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'UNVERIFIED'],
      default: 'VERIFIED',
    },
    retrievedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

LocationResultSchema.index({ taskId: 1, retrievedAt: -1 });

export default mongoose.models.LocationResult || mongoose.model('LocationResult', LocationResultSchema);
