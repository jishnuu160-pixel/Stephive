import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Brand name is required'],
      unique: true,
      trim: true,
      maxlength: [50, 'Brand name cannot exceed 50 characters']
    },
    description: {
      type: String,
      required: [true, 'Brand description is required'],
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters']
    },
    isListed: {
      type: Boolean,
      default: true
    },
    logo: {
      type: String,
      required: [true, 'Brand logo image URL/path is required'],
      trim: true
    }
  },
  { timestamps: true }
);

brandSchema.index({ name: 'text' });
const Brand = mongoose.model('Brand', brandSchema);

export default Brand;