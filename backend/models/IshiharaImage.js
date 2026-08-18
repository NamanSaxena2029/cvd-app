const mongoose = require('mongoose');

const ishiharaImageSchema = new mongoose.Schema(
  {
    plateId: { type: String, required: true, unique: true, trim: true, index: true },

    // Plate number within its source edition (e.g. 1..38 for the 38-plate book).
    plateNumber: { type: Number, required: true, index: true },

    // What kind of plate this is, per Ishihara's own published plate design.
    plateType: {
      type: String,
      required: true,
      enum: [
        'demonstration',
        'transformation',
        'vanishing',
        'hidden_digit',
        'diagnostic',
        'classification_tracing',
      ],
    },

    // Broad grouping used for admin filtering / error-pattern analysis.
    category: {
      type: String,
      required: true,
      enum: ['demonstration', 'red_green', 'total_color_deficiency', 'classification_tracing'],
      index: true,
    },

    // --- Image -----------------------------------------------------------
    // null until a licensed/verified image file is actually present on disk
    // (see backend/dataset/manifest.json + scripts/validateIshiharaDataset.js).
    imageUrl: { type: String, default: null },

    // --- Provenance --------------------------------------------------------
    imageSource: { type: String, default: null }, // e.g. "Krzywinski, Ishihara's Tests for Colour Deficiency"
    imageSourceUrl: { type: String, default: null },
    imageLicense: { type: String, default: null }, // human-readable license/permission status
    imageVerified: { type: Boolean, default: false, index: true }, // true only once a human has confirmed image + rights

    // --- Verified response metadata (nullable; do not invent) --------------
    normalVisionResponse: { type: String, default: null },
    redGreenDeficientResponse: { type: String, default: null },
    totalColorBlindResponse: { type: String, default: null },
    protanResponse: { type: String, default: null },
    deutanResponse: { type: String, default: null },

    notes: { type: String, default: null }, // free-text sourcing/scoring notes
    purpose: { type: String, default: null }, // human-readable description of what the plate tests

    active: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

ishiharaImageSchema.pre('validate', function enforceActivePlateHasVerifiedImage(next) {
  if (this.active && (!this.imageUrl || !this.imageVerified)) {
    return next(
      new Error(
        'A plate cannot be active without both imageUrl and imageVerified=true. ' +
          'See DATASET_LICENSE.md before activating a plate.'
      )
    );
  }
  return next();
});

module.exports = mongoose.model('IshiharaImage', ishiharaImageSchema);