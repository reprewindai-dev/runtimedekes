import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __dekesPrisma__: PrismaClient | undefined
}

export const db =
  global.__dekesPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  global.__dekesPrisma__ = db
}
