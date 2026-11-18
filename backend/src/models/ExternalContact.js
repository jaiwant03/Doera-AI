import mongoose from 'mongoose';

const ExternalContactSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    businessName: {
      type: String,
      required: true,
    },
    serviceCategory: String,
    phone: String,
    email: String,
    address: String,
    location: {
      lat: Number,
      lng: Number,
    },
    website: String,
    rating: Number,
    reviewsCount: Number,
    openingHours: [String],
    source: {
      type: String,
      enum: ['GOOGLE_PLACES', 'OPENSTREETMAP', 'MANUAL', 'WEB_SCRAPED'],
      required: true,
    },
    sourceUrl: String,
    communicationStatus: {
      type: String,
      enum: ['UNCONTACTED', 'CONTACT_QUEUED', 'MESSAGE_SENT', 'REPLIED', 'FAILED'],
      default: 'UNCONTACTED',
    },
    lastContactedAt: Date,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ExternalContact || mongoose.model('ExternalContact', ExternalContactSchema);
