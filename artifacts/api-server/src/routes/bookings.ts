import { Router, type IRouter } from "express";
import {
  CancelBookingParams,
  CancelBookingResponse,
  CreateBookingBody,
  CreateBookingHeader,
  CreateBookingResponse,
  CreateBookingCheckoutResponse,
  GetBookingParams,
  GetBookingResponse,
  ListBookingsResponse,
  VerifyBookingPaymentBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth.ts";
import {
  BookingConflictError,
  BookingNotFoundError,
  BookingProviderUnavailableError,
  cancelUserBooking,
  createUserBooking,
  findBooking,
  listUserBookings,
  parseBookingInput,
} from "./booking.ts";
import { startBookingCheckout, verifyBookingPayment } from "../lib/booking-payments.ts";

const bookingsRouter: IRouter = Router();
bookingsRouter.use(requireAuth);

function invalidInput(res: Parameters<Parameters<IRouter["post"]>[1]>[1], message: string, fieldErrors?: Record<string, string>) {
  res.status(400).json({ error: { code: "INVALID_INPUT", message, ...(fieldErrors ? { fieldErrors } : {}) } });
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function handleError(res: Parameters<Parameters<IRouter["get"]>[1]>[1], error: unknown) {
  if (error instanceof BookingNotFoundError) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: error.message } });
    return;
  }
  if (error instanceof BookingConflictError) {
    res.status(409).json({ error: { code: "BOOKING_CONFLICT", message: error.message } });
    return;
  }
  if (error instanceof BookingProviderUnavailableError) {
    res.status(503).json({ error: { code: "INVENTORY_PROVIDER_UNAVAILABLE", message: error.message } });
    return;
  }
  res.status(503).json({ error: { code: "BOOKING_UNAVAILABLE", message: "Bookings are temporarily unavailable. Please try again." } });
}

bookingsRouter.get("/v1/bookings", async (req, res): Promise<void> => {
  try {
    const items = await listUserBookings(req.localUser!.id);
    res.json(ListBookingsResponse.parse({
      notice: "These bookings belong to your authenticated Travel & Land account. Verified payment confirms the request; supplier reservation remains a development preview.",
      items,
    }));
  } catch (error) {
    handleError(res, error);
  }
});

bookingsRouter.post("/v1/bookings/:reference/checkout", async (req, res): Promise<void> => {
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking not found." } });
    return;
  }
  const header = CreateBookingHeader.safeParse({ "Idempotency-Key": req.get("Idempotency-Key") ?? "" });
  if (!header.success) {
    invalidInput(res, "An idempotency key is required to safely retry checkout.");
    return;
  }
  const idempotencyKey = header.data["Idempotency-Key"];
  try {
    const checkout = await startBookingCheckout(req.localUser!.id, params.data.reference, idempotencyKey);
    res.json(CreateBookingCheckoutResponse.parse(checkout));
  } catch (error) {
    handleError(res, error);
  }
});

bookingsRouter.post("/v1/bookings/:reference/payment/verify", async (req, res): Promise<void> => {
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking not found." } });
    return;
  }
  const body = VerifyBookingPaymentBody.safeParse(req.body);
  if (!body.success) {
    invalidInput(res, "Payment verification details are invalid.");
    return;
  }
  try {
    const booking = await verifyBookingPayment(req.localUser!.id, params.data.reference, {
      orderId: body.data.razorpay_order_id,
      paymentId: body.data.razorpay_payment_id,
      signature: body.data.razorpay_signature,
    });
    res.json(GetBookingResponse.parse({ booking }));
  } catch (error) {
    handleError(res, error);
  }
});

bookingsRouter.post("/v1/bookings", async (req, res): Promise<void> => {
  const header = CreateBookingHeader.safeParse({ "Idempotency-Key": req.get("Idempotency-Key") ?? "" });
  if (!header.success) {
    invalidInput(res, "An idempotency key is required to safely retry booking creation.");
    return;
  }
  const body = CreateBookingBody.safeParse(req.body);
  if (!body.success) {
    invalidInput(res, "Booking details need attention.", { booking: body.error.message });
    return;
  }
  const parsed = parseBookingInput({
    ...body.data,
    checkIn: dateOnly(body.data.checkIn),
    checkOut: dateOnly(body.data.checkOut),
  });
  if (!parsed.success) {
    invalidInput(res, parsed.error, parsed.fieldErrors);
    return;
  }
  try {
    const booking = await createUserBooking(req.localUser!.id, parsed.data, header.data["Idempotency-Key"]);
    res.status(201).json(CreateBookingResponse.parse({ booking }));
  } catch (error) {
    handleError(res, error);
  }
});

bookingsRouter.get("/v1/bookings/:reference", async (req, res): Promise<void> => {
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking not found." } });
    return;
  }
  try {
    const booking = await findBooking(req.localUser!.id, params.data.reference);
    if (!booking) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking not found." } });
      return;
    }
    res.json(GetBookingResponse.parse({ booking }));
  } catch (error) {
    handleError(res, error);
  }
});

bookingsRouter.post("/v1/bookings/:reference/cancel", async (req, res): Promise<void> => {
  const params = CancelBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking not found." } });
    return;
  }
  try {
    const booking = await cancelUserBooking(req.localUser!.id, params.data.reference);
    if (!booking) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Booking not found." } });
      return;
    }
    res.json(CancelBookingResponse.parse({ booking }));
  } catch (error) {
    handleError(res, error);
  }
});

export default bookingsRouter;