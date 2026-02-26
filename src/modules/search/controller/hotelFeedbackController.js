import asyncHandler from "../../../common/utils/asyncHandler.js";
import * as hotelFeedbackService from "../services/hotelFeedbackService.js";

export const getHotelFeedback = asyncHandler(async (req, res) => {
   console.info(`[search][getHotelFeedback] Request received | hotelId=${req.params.id}`);

   const feedbackSection = await hotelFeedbackService.getHotelFeedbackById(
      req.params.id,
   );

   if (!feedbackSection) {
      res.status(404);
      throw new Error("Hotel not found");
   }

   console.info(
      `[search][getHotelFeedback] Completed | hotelId=${req.params.id} reviewCount=${feedbackSection.reviewCount}`,
   );

   res.status(200).json({
      success: true,
      data: feedbackSection,
   });
});

export const addHotelFeedback = asyncHandler(async (req, res) => {
   console.info(
      `[search][addHotelFeedback] Request received | hotelId=${req.params.id} userId=${req.user?._id}`,
   );

   const created = await hotelFeedbackService.addFeedbackToHotel(
      req.params.id,
      req.user,
      req.body,
   );

   if (!created) {
      res.status(404);
      throw new Error("Hotel not found");
   }

    console.info(
      `[search][addHotelFeedback] Completed | hotelId=${req.params.id} reviewCount=${created.reviewCount}`,
   );

   res.status(201).json({
      success: true,
      data: created.feedback,
      summary: {
         averageRating: created.averageRating,
         reviewCount: created.reviewCount,
      },
   });
});

export const updateHotelFeedback = asyncHandler(async (req, res) => {
   console.info(
      `[search][updateHotelFeedback] Request received | hotelId=${req.params.id} feedbackId=${req.params.feedbackId} userId=${req.user?._id}`,
   );

   const result = await hotelFeedbackService.updateHotelFeedback(
      req.params.id,
      req.params.feedbackId,
      req.user,
      req.body,
      req.user.role === "Admin",
   );

   if (result?.notFound === "hotel") {
      res.status(404);
      throw new Error("Hotel not found");
   }

   if (result?.notFound === "feedback") {
      res.status(404);
      throw new Error("Feedback not found");
   }

   if (result?.forbidden) {
      return res.status(403).json({
         success: false,
         error: "Not authorized to update this feedback",
      });
   }

   console.info(
      `[search][updateHotelFeedback] Completed | hotelId=${req.params.id} feedbackId=${req.params.feedbackId} reviewCount=${result.reviewCount}`,
   );

   res.status(200).json({
      success: true,
      data: result.feedback,
      summary: {
         averageRating: result.averageRating,
         reviewCount: result.reviewCount,
      },
   });
});

/**
 * Add hotel feedback and automatically sync the certificate trust score.
 * POST /hotels-search/contacts/:id/feedback
 */
export const addHotelFeedbackWithTrustSync = asyncHandler(async (req, res) => {
   console.info(
      `[search][addHotelFeedbackWithTrustSync] Request received | hotelId=${req.params.id} userId=${req.user?._id}`,
   );

   const created = await hotelFeedbackService.addFeedbackAndSyncCertificate(
      req.params.id,
      req.user,
      req.body,
   );

   if (!created) {
      res.status(404);
      throw new Error("Hotel not found");
   }

   console.info(
      `[search][addHotelFeedbackWithTrustSync] Completed | hotelId=${req.params.id} reviewCount=${created.reviewCount}`,
   );

   res.status(201).json({
      success: true,
      data: created.feedback,
      summary: {
         averageRating: created.averageRating,
         reviewCount: created.reviewCount,
      },
   });
});

export const deleteHotelFeedback = asyncHandler(async (req, res) => {
   console.info(
      `[search][deleteHotelFeedback] Request received | hotelId=${req.params.id} feedbackId=${req.params.feedbackId} userId=${req.user?._id}`,
   );

   const result = await hotelFeedbackService.deleteHotelFeedback(
      req.params.id,
      req.params.feedbackId,
      req.user,
      req.user.role === "Admin",
   );

   if (result?.notFound === "hotel") {
      res.status(404);
      throw new Error("Hotel not found");
   }

   if (result?.notFound === "feedback") {
      res.status(404);
      throw new Error("Feedback not found");
   }

   if (result?.forbidden) {
      return res.status(403).json({
         success: false,
         error: "Not authorized to delete this feedback",
      });
   }

   console.info(
      `[search][deleteHotelFeedback] Completed | hotelId=${req.params.id} feedbackId=${req.params.feedbackId} reviewCount=${result.reviewCount}`,
   );

   res.status(200).json({
      success: true,
      data: {},
      summary: {
         averageRating: result.averageRating,
         reviewCount: result.reviewCount,
      },
   });
});
