-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'DINERS', 'OTHER');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CashbackType" AS ENUM ('FLAT', 'CATEGORY_BASED', 'NONE');

-- CreateEnum
CREATE TYPE "CashbackCapType" AS ENUM ('NO_CAP', 'MONTHLY_CAP', 'QUARTERLY_CAP', 'ANNUAL_CAP');

-- CreateEnum
CREATE TYPE "CashbackCapPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('LIFETIME_FREE', 'ANNUAL_FEE', 'JOINING_AND_ANNUAL_FEE');

-- CreateEnum
CREATE TYPE "PlatformType" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('FOOD', 'SHOPPING', 'TRAVEL', 'UTILITY', 'BILLS', 'SUBSCRIPTION', 'MEDICAL', 'FUEL', 'OTHERS');

-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('FRIEND', 'FAMILY', 'RELATIVE', 'COLLEAGUE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_PAID', 'PARTIALLY_PAID', 'FULLY_PAID');

-- CreateEnum
CREATE TYPE "CashbackStatus" AS ENUM ('PENDING', 'CREDITED', 'MISSED');

-- CreateEnum
CREATE TYPE "BillingPaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_cards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "cardType" "CardType" NOT NULL,
    "lastFourDigits" VARCHAR(4) NOT NULL,
    "creditLimit" DECIMAL(12,2) NOT NULL,
    "billingDate" INTEGER NOT NULL,
    "dueDate" INTEGER NOT NULL,
    "cardStatus" "CardStatus" NOT NULL DEFAULT 'ACTIVE',
    "cashbackType" "CashbackType" NOT NULL DEFAULT 'NONE',
    "cashbackPercent" DECIMAL(5,2),
    "cashbackCapType" "CashbackCapType" NOT NULL DEFAULT 'NO_CAP',
    "cashbackCapAmount" DECIMAL(10,2),
    "cashbackCapPeriod" "CashbackCapPeriod",
    "quarterStartMonth" INTEGER,
    "feeType" "FeeType" NOT NULL DEFAULT 'LIFETIME_FREE',
    "annualFeeAmount" DECIMAL(10,2),
    "joiningFeeAmount" DECIMAL(10,2),
    "annualSpendWaiver" DECIMAL(12,2),
    "feeRenewalMonth" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "merchantName" TEXT,
    "platformType" "PlatformType" NOT NULL DEFAULT 'OFFLINE',
    "platformSource" TEXT,
    "category" "Category" NOT NULL,
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "billingCycleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrowed_expenses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "personType" "PersonType" NOT NULL,
    "amountOwed" DECIMAL(12,2) NOT NULL,
    "amountReceived" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_PAID',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "borrowed_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repayment_records" (
    "id" TEXT NOT NULL,
    "borrowedId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repayment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashback_records" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "expectedAmount" DECIMAL(10,2) NOT NULL,
    "creditedAmount" DECIMAL(10,2),
    "status" "CashbackStatus" NOT NULL DEFAULT 'PENDING',
    "creditedDate" TIMESTAMP(3),
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashback_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_cycles" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "cycleStart" TIMESTAMP(3) NOT NULL,
    "cycleEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalSpend" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentStatus" "BillingPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "borrowed_expenses_transactionId_key" ON "borrowed_expenses"("transactionId");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "cashback_records_transactionId_key" ON "cashback_records"("transactionId");

-- AddForeignKey
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_billingCycleId_fkey" FOREIGN KEY ("billingCycleId") REFERENCES "billing_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrowed_expenses" ADD CONSTRAINT "borrowed_expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrowed_expenses" ADD CONSTRAINT "borrowed_expenses_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayment_records" ADD CONSTRAINT "repayment_records_borrowedId_fkey" FOREIGN KEY ("borrowedId") REFERENCES "borrowed_expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_records" ADD CONSTRAINT "cashback_records_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_records" ADD CONSTRAINT "cashback_records_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_cycles" ADD CONSTRAINT "billing_cycles_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
